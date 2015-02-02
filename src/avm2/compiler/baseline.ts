/*
 * Copyright 2015 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module Shumway.AVM2.Compiler {
  import AbcFile = ABC.AbcFile;
  import MethodInfo = ABC.MethodInfo;
  import Scope = Runtime.Scope;
  import Multiname = ABC.Multiname;
  import InstanceInfo = ABC.InstanceInfo;
  import ConstantPool = ABC.ConstantPool;
  import assert = Debug.assert;

  var writer = Compiler.baselineDebugLevel.value > 0 ? new IndentingWriter() : null;

  declare var Relooper;

  var compileCount = 0, passCompileCount = 0, failCompileCount = 0, compileTime = 0;

  class Emitter {
    private _buffer: string [];
    private _indent = 0;
    private _emitIndent;
    constructor(emitIndent: boolean) {
      this._buffer = [];
      this._emitIndent = emitIndent;
    }
    reset() {
      this._buffer.length = 0;
      this._indent = 0;
    }
    enter(s: string) {
      this.writeLn(s);
      this._indent ++;
    }
    leave(s: string) {
      this._indent --;
      this.writeLn(s);
    }
    leaveAndEnter(s: string) {
      this._indent --;
      this.writeLn(s);
      this._indent ++;
    }
    writeLn(s: string) {
      if (!release && this._emitIndent) {
        var prefix = "";
        for (var i = 0; i < this._indent; i++) {
          prefix += "  ";
        }
        s = prefix + s;
      }
      this._buffer.push(s);
    }
    writeLns(s: string) {
      if (release) {
        this._buffer.push(s);
        return;
      }
      var lines = s.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.length > 0) {
          this.writeLn(lines[i]);
        }
      }
    }
    indent() {
      this._indent ++;
    }
    outdent() {
      this._indent --;
    }
    toString(): string {
      return this._buffer.join("\n");
    }
  }

  class BaselineCompiler {
    blocks: Bytecode [];
    bytecodes: Bytecode [];
    bodyEmitter: Emitter;
    blockEmitter: Emitter;
    relooperEntryBlock: number;
    parameters: string [];
    local: string [];
    constantPool: ConstantPool;

    private pushedStrings: number[] = [];
    private stack: number = 0;
    private scopeIndex: number = 0;
    private hasNext2Infos: number = 0;

    private blockBodies: string[] = [];

    static localNames = ["this", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];

    /**
     * Make sure that none of these shadow global names.
     */
    static stackNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

    constructor(public methodInfo: MethodInfo, private scope: Scope, private hasDynamicScope: boolean,
                private globalMiName: string) {
      this.constantPool = this.methodInfo.abc.constantPool;
    }

    compile() {
      compileCount++;

      Relooper.cleanup();

      Relooper.init();

      this.bodyEmitter = new Emitter(!release);
      this.blockEmitter = new Emitter(!release);

      var hasExceptions = this.methodInfo.hasExceptions();

      if (hasExceptions) {
        this.bodyEmitter.writeLn("var pc = 0;");
      }

      var start = performance.now();
      release || writer && writer.writeLn("Compiling: " + compileCount + " " + this.methodInfo);

      var analysis = this.methodInfo.analysis || new Analysis(this.methodInfo);
      if (!analysis.analyzedControlFlow) {
        analysis.analyzeControlFlow();
      }
      this.methodInfo.classScope = this.scope;

      var blocks = this.blocks = analysis.blocks;
      this.bytecodes = analysis.bytecodes;

      release || writer && writer.writeLn("Code: " + this.bytecodes.length + ", Blocks: " + blocks.length);

      this.local = ['this'];
      // TODO: Emit locals, parameters, and stack slots after body, and collect required info there.
      // This would allow us to get rid of that part of the analysis phase above, and in many cases,
      // because the information in the header is often incorrect, emit less code.
      this.parameters = [];
      if (this.hasDynamicScope) {
        this.parameters.push('$0');
      }
      var paramsCount = this.methodInfo.parameters.length;
      for (var i = 0; i < paramsCount; i ++) {
        var param = this.methodInfo.parameters[i];
        var paramName = this.getLocalName(i + 1);
        this.local.push(paramName);
        this.parameters.push(paramName);
        if (param.optional && param.isUsed) {
          var value = param.value;
          if (!param.type && !value) {
            value = 'undefined';
          } else if (Multiname.getQualifiedName(param.type) === '$BgString') {
            value = '"' + value + '"';
          }
          this.bodyEmitter.writeLn('arguments.length < ' + (i + 1) + ' && (' + paramName + ' = ' + value + ');');
        }
      }

      var localsCount = this.methodInfo.localCount;
      if (localsCount > paramsCount + 1) {
        var localsDefinition = 'var ';
        for (var i = paramsCount + 1; i < localsCount; i++) {
          this.local.push(this.getLocalName(i));
          localsDefinition += this.local[i] + (i < (localsCount - 1) ? ', ' : ';');
        }
        this.bodyEmitter.writeLn(localsDefinition);
      }

      if (this.methodInfo.maxStack > 0) {
        var stackSlotsDefinition = 'var ';
        for (var i = 0; i < this.methodInfo.maxStack; i++) {
          stackSlotsDefinition +=
          this.getStack(i) + (i < (this.methodInfo.maxStack - 1) ? ', ' : ';');
        }
        this.bodyEmitter.writeLn(stackSlotsDefinition);
      }

      var scopesCount = this.methodInfo.maxScopeDepth - this.methodInfo.initScopeDepth + 1;
      var scopesOffset = this.hasDynamicScope ? 1 : 0;
      if (scopesCount - scopesOffset) {
        var scopesDefinition = 'var ';
        for (var i = scopesOffset; i < scopesCount; i++) {
          scopesDefinition += this.getScope(i) + (i < (scopesCount - 1) ? ', ' : ';');
        }
        this.bodyEmitter.writeLn(scopesDefinition);
      }

      this.bodyEmitter.writeLn('var mi = ' + this.globalMiName + ';');
      if (!this.hasDynamicScope) {
        this.bodyEmitter.writeLn('$0 = mi.classScope;');
      }

      if (this.methodInfo.needsRest() || this.methodInfo.needsArguments()) {
        var offset = this.methodInfo.needsRest() ? paramsCount : 0;
        this.bodyEmitter.writeLn(this.local[paramsCount + 1] +
                                 ' = sliceArguments(arguments, ' + offset + ');');
      }

      var relooperEntryBlock = this.relooperEntryBlock = Relooper.addBlock("// Entry Block");

      // Create a relooper block for each basic block.
      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        block.relooperBlock = Relooper.addBlock("// Block: " + block.bid);
      }

      // If we have exception handlers, dispatch to appropriate block using the current PC, which
      // was set in the catch block.
      var exceptionEntryBlocks = [];
      if (hasExceptions) {
        var exceptions = this.methodInfo.exceptions;
        for (var i = 0; i < exceptions.length; i++) {
          var target = exceptions[i].target;
          exceptionEntryBlocks[target.bid] = target;
          Relooper.addBranch(relooperEntryBlock, target.relooperBlock, "pc === " + target.pc);
        }
      }

      // By default we dispatch to the first block.
      Relooper.addBranch(relooperEntryBlock, blocks[0].relooperBlock);

      var processedBlocks = [];

      // Emit blocks.
      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        var bid = block.bid;
        release || assert(!processedBlocks[bid]);
        if (exceptionEntryBlocks[bid]) {
          this.stack = 1;
          this.scopeIndex = 0;
        } else if (block.preds.length) {
          var predBlockExits = processedBlocks[block.preds[0].bid];
          if (predBlockExits) {
            this.stack = predBlockExits.stack;
            this.scopeIndex = predBlockExits.scopeIndex;
            if (!release) {
              for (var j = 1; j < block.preds.length; j++) {
                predBlockExits = processedBlocks[block.preds[j].bid];
                assert(predBlockExits);
                assert(predBlockExits.stack === this.stack);
                assert(predBlockExits.scopeIndex === this.scopeIndex);
              }
            }
          }
        } else if (!release) {
          assert(this.stack === 0);
          assert(this.scopeIndex === 0);
        }
        this.emitBlock(block);
        if (!release) {
          assert(this.stack >= 0);
          assert(this.scopeIndex >= 0);
        }
        processedBlocks[bid] = {stack: this.stack, scopeIndex: this.scopeIndex};
      }

      if (this.hasNext2Infos > 0) {
        var hasNext2Definition = 'var ';
        for (var i = 0; i < this.hasNext2Infos; i++) {
          hasNext2Definition += 'hasNext' + i + ' = new HasNext2Info()';
          hasNext2Definition += (i < (this.hasNext2Infos - 1) ? ', ' : ';');
        }
        this.bodyEmitter.writeLn(hasNext2Definition);
      }

      if (hasExceptions) {
        this.bodyEmitter.enter("while(1) {");
        this.bodyEmitter.enter("try {");
      }

      var allBlocks: string = Relooper.render(this.relooperEntryBlock);
      for (var i = 0; i < blocks.length; i++) {
        var bid = blocks[i].bid;
        var blockCode = this.blockBodies[bid];
        release || assert(blockCode);
        allBlocks = allBlocks.split('"\'"\'' + bid + '"\'"\'').join(blockCode);
      }
      this.bodyEmitter.writeLns(allBlocks);

      if (hasExceptions) {
        this.bodyEmitter.leaveAndEnter("} catch (ex) {");
        var exceptions = this.methodInfo.exceptions;
        for (var i = 0; i < exceptions.length; i++) {
          var handler = exceptions[i];
          var check = "";
          if (handler.typeName) {
            // TODO: Encode type name correctly here.
            check = " && " + handler.typeName + ".isType(ex)";
          }
          this.bodyEmitter.writeLn("if (pc >= " + handler.start_pc + " && pc <= " + handler.end_pc + check + ") { pc = " + handler.target_pc + "; continue; }");
        }
        this.bodyEmitter.leave("}");
        this.bodyEmitter.leave("}");
      }

      var body = this.bodyEmitter.toString();

      // writer.writeLn(body);

      var duration = performance.now() - start;
      compileTime += duration;
      passCompileCount++;
      writer && writer.writeLn("Compiled: PASS: " + passCompileCount +
                               ", FAIL: " + failCompileCount +
                               ", TIME: " + (duration).toFixed(2) +
                               ", RATIO: " + (passCompileCount / compileCount).toFixed(2) +
                               " (" + compileTime.toFixed(2) + " total)");

      return {body: body, parameters: this.parameters};
    }

    /**
     * Get's the first exception handler to cover the pc.
     */
    getHandler(bc: Bytecode) {
      // Bytecode can't throw.
      if (!opcodeTable[bc.op].canThrow) {
        return null;
      }
      var pc = bc.pc;
      var exceptions = this.methodInfo.exceptions;
      for (var i = 0; i < exceptions.length; i++) {
        var exception = exceptions[i];
        if (exception.start_pc >= pc && pc <= exception.end_pc) {
          return exception;
        }
      }
      return null;
    }

    getStack(i: number): string {
      if (i >= BaselineCompiler.stackNames.length) {
        return "s" + (i - BaselineCompiler.stackNames.length);
      }
      return BaselineCompiler.stackNames[i];
    }

    stackTop(): string {
      return this.getStack(this.stack);
    }

    getLocalName(i: number): string {
      if (i >= BaselineCompiler.localNames.length) {
        return "l" + (i - BaselineCompiler.localNames.length);
      }
      return BaselineCompiler.localNames[i];
    }

    getScope(i: number): string {
      return "$" + i;
    }

    getLocal(i: number): string {
      if (i < 0 || i >= this.local.length) {
        throw new Error("Out of bounds local read: " + i + ' > ' + (this.local.length - 1));
      }
      return this.local[i];
    }

    peekAny(): string {
      return this.peek();
    }

    peek(): string {
      return this.getStack(this.stack - 1);
    }

    popAny(): string {
      return this.pop();
    }

    emitPopTemporaries(n: number) {
      for (var i = 0; i < n; i++) {
        this.blockEmitter.writeLn("var t" + i + " = " + this.pop() + ";");
      }
    }

    emitPushTemporary(...indices: number []) {
      for (var i = 0; i < indices.length; i++) {
        this.emitPush("t" + indices[i]);
      }
    }

    pop(): string {
      this.stack --;
      return this.getStack(this.stack);
    }

    emitBlock(block: Bytecode) {
      this.blockEmitter.reset();
      if (!release && Compiler.baselineDebugLevel.value > 1) {
        this.emitLine("// Block: " + block.bid);
        writer.writeLn("// Block: " + block.bid);
      }
      var bytecodes = this.bytecodes;
      var bc;
      for (var bci = block.position, end = block.end.position; bci <= end; bci++) {
        bc = bytecodes[bci];
        this.emitBytecode(block, bc);
      }
      this.blockBodies[block.bid] = this.blockEmitter.toString();
      Relooper.setBlockCode(block.relooperBlock, '"\'"\'' + block.bid + '"\'"\'');

      var nextBlock = (end + 1 < bytecodes.length) ? bytecodes[end + 1] : null;
      if (nextBlock && !bc.isBlockEnd()) {
        Relooper.addBranch(block.relooperBlock, nextBlock.relooperBlock);
      }
    }

    peekScope() {
      return this.getScope(this.scopeIndex);
    }

    emitBytecode(block: Bytecode, bc: Bytecode) {
      release || assert(this.stack >= 0);
      release || assert(this.scopeIndex >= 0);

      // If a exception handler exists for the current PC, save the PC in case we throw. This is
      // how the catch block can figure out where we came from.
      if (this.getHandler(bc)) {
        this.blockEmitter.writeLn("pc = " + bc.pc + ";");
      }

      var op = bc.op;
      if (!release) {
        var opName = OP[op];
        Compiler.baselineDebugLevel.value > 1 && this.emitLine("// BC: " + String(bc));
      }
      switch (op) {
        case OP.getlocal:
          this.emitLoadLocal(bc.index);
          break;
        case OP.getlocal0:
        case OP.getlocal1:
        case OP.getlocal2:
        case OP.getlocal3:
          this.emitLoadLocal(op - OP.getlocal0);
          break;
        case OP.setlocal:
          this.emitStoreLocal(bc.index);
          break;
        case OP.setlocal0:
        case OP.setlocal1:
        case OP.setlocal2:
        case OP.setlocal3:
          this.emitStoreLocal(op - OP.setlocal0);
          break;
        case OP.initproperty:
        case OP.setproperty:
          this.emitSetProperty(bc.index);
          break;
        case OP.setsuper:
          this.emitSetSuper(bc.index);
          break;
        case OP.getproperty:
          this.emitGetProperty(bc.index);
          break;
        case OP.getsuper:
          this.emitGetSuper(bc.index);
          break;
        case OP.deleteproperty:
          this.emitDeleteProperty(bc.index);
          break;
        case OP.findproperty:
          this.emitFindProperty(bc.index, false);
          break;
        case OP.findpropstrict:
          this.emitFindProperty(bc.index, true);
          break;
        case OP.callproperty:
        case OP.callpropvoid:
        case OP.callproplex:
          this.emitCallProperty(bc);
          break;
        case OP.callsuper:
        case OP.callsupervoid:
        this.emitCallSuper(bc);
        break;
        case OP.call:
          this.emitCall(bc);
          break;
        case OP.getlex:
          this.emitGetLex(bc.index);
          break;
        case OP.pushwith:
          this.emitPushScope(true);
          break;
        case OP.pushscope:
          this.emitPushScope(false);
          break;
        case OP.popscope:
          this.popScope();
          break;
        case OP.getglobalscope:
          this.emitGetGlobalScope();
          break;
        case OP.getscopeobject:
          this.emitGetScopeObject();
          break;
        case OP.getslot:
          this.emitGetSlot(bc.index);
          break;
        case OP.setslot:
          this.emitSetSlot(bc.index);
          break;
        case OP.newactivation:
          this.emitPush('Object.create(mi.activationPrototype)');
          break;
        case OP.newobject:
          this.emitNewObject(bc);
          break;
        case OP.newarray:
          this.emitNewArray(bc);
          break;
        case OP.newclass:
          this.emitNewClass(bc);
          break;
        case OP.newfunction:
          this.emitNewFunction(bc);
          break;
        case OP.newcatch:
          this.emitNewCatch(bc);
          break;
        case OP.construct:
          this.emitConstruct(bc);
          break;
        case OP.constructprop:
          this.emitConstructProperty(bc);
          break;
        case OP.throw:
          this.emitThrow();
          break;
        case OP.hasnext2:
          this.emitHasNext2(bc);
          break;
        case OP.nextname:
          this.emitNextName();
          break;
        case OP.nextvalue:
          this.emitNextValue();
          break;
        case OP.jump:
          this.emitJump(block, bc);
          break;
        case OP.ifnlt:
          this.emitBinaryIf(block, bc, "<", true);
          break;
        case OP.ifnge:
          this.emitBinaryIf(block, bc, ">=", true);
          break;
        case OP.ifngt:
          this.emitBinaryIf(block, bc, ">", true);
          break;
        case OP.ifnle:
          this.emitBinaryIf(block, bc, "<=", true);
          break;
        case OP.ifge:
          this.emitBinaryIf(block, bc, ">=", false);
          break;
        case OP.ifgt:
          this.emitBinaryIf(block, bc, ">", false);
          break;
        case OP.ifle:
          this.emitBinaryIf(block, bc, "<=", false);
          break;
        case OP.iflt:
          this.emitBinaryIf(block, bc, "<", false);
          break;
        case OP.ifeq:
          this.emitBinaryIf(block, bc, "==", false);
          break;
        case OP.ifne:
          this.emitBinaryIf(block, bc, "!=", false);
          break;
        case OP.ifstricteq:
          this.emitBinaryIf(block, bc, "===", false);
          break;
        case OP.ifstrictne:
          this.emitBinaryIf(block, bc, "!==", false);
          break;
        case OP.iftrue:
          this.emitUnaryIf(block,  bc, "!!");
          break;
        case OP.iffalse:
          this.emitUnaryIf(block,  bc, "!");
          break;
        case OP.lookupswitch:
          this.emitLookupSwitch(block, bc);
          break;
        case OP.pushstring:
          this.emitPushString(bc);
          break;
        case OP.pushdouble:
          this.emitPushDouble(bc);
          break;
        case OP.pushint:
          this.emitPush(this.constantPool.ints[bc.index]);
          break;
        case OP.pushuint:
          this.emitPush(this.constantPool.uints[bc.index]);
          break;
        case OP.pushbyte:
        case OP.pushshort:
          this.emitPush(bc.value);
          break;
        case OP.pushnull:
          this.emitPush(null);
          break;
        case OP.pushundefined:
          this.emitPush(undefined);
          break;
        case OP.pushtrue:
          this.emitPush(true);
          break;
        case OP.pushfalse:
          this.emitPush(false);
          break;
        case OP.pushnan:
          this.emitPush('NaN');
          break;
        case OP.pop:
          // TODO whether this can validly happen. It does happen in mx.core::BitmapAsset's ctor,
          // where a block starts with a pop, but perhaps something has gone wrong earlier for that?
          if (this.stack > 0) {
            this.stack--;
          }
          break;
        case OP.kill:
          if (bc.index > 0) {
            this.emitReplaceLocal(bc.index, 'undefined');
          }
          break;
        case OP.constructsuper:
          this.emitConstructSuper(bc);
          break;
        case OP.increment:
          this.emitLine(this.peek() + '++;');
          break;
        case OP.increment_i:
          this.emitReplace('(' + this.peek() + '|0) + ' + 1);
          break;
        case OP.decrement:
          this.emitLine(this.peek() + '--;');
          break;
        case OP.decrement_i:
          this.emitReplace('(' + this.peek() + '|0) - ' + 1);
          break;
        case OP.inclocal:
          this.emitLine(this.getLocal(bc.index) + '++;');
          break;
        case OP.inclocal_i:
          this.emitReplaceLocal(bc.index, '(' + this.getLocal(bc.index) + '|0) + ' + 1);
          break;
        case OP.declocal:
          this.emitLine(this.getLocal(bc.index) + '--;');
          break;
        case OP.declocal_i:
          this.emitReplaceLocal(bc.index, '(' + this.getLocal(bc.index) + '|0) - ' + 1);
          break;
        case OP.not:
          this.emitUnaryOp('!');
          break;
        case OP.bitnot:
          this.emitUnaryOp('~');
          break;
        case OP.negate:
          this.emitUnaryOp('-');
          break;
        case OP.negate_i:
          this.emitUnaryOp_i('-');
          break;
        case OP.unplus:
          this.emitUnaryOp('+');
          break;
        case OP.equals:
          this.emitEquals();
          break;
        case OP.add:
          this.emitAddExpression();
          break;
        case OP.add_i:
          this.emitAddExpression_i();
          break;
        case OP.subtract:
          this.emitBinaryExpression(' - ');
          break;
        case OP.subtract_i:
          this.emitBinaryExpression_i(' - ');
          break;
        case OP.multiply:
          this.emitBinaryExpression(' * ');
          break;
        case OP.multiply_i:
          this.emitBinaryExpression_i(' * ');
          break;
        case OP.divide:
          this.emitBinaryExpression(' / ');
          break;
        case OP.modulo:
          this.emitBinaryExpression(' % ');
          break;
        case OP.lshift:
          this.emitBinaryExpression(' << ');
          break;
        case OP.rshift:
          this.emitBinaryExpression(' >> ');
          break;
        case OP.urshift:
          this.emitBinaryExpression(' >>> ');
          break;
        case OP.bitand:
          this.emitBinaryExpression(' & ');
          break;
        case OP.bitor:
          this.emitBinaryExpression(' | ');
          break;
        case OP.bitxor:
          this.emitBinaryExpression(' ^ ');
          break;
        case OP.strictequals:
          this.emitBinaryExpression(' === ');
          break;
        case OP.lessequals:
          this.emitBinaryExpression(' <= ');
          break;
        case OP.lessthan:
          this.emitBinaryExpression(' < ');
          break;
        case OP.greaterequals:
          this.emitBinaryExpression(' >= ');
          break;
        case OP.greaterthan:
          this.emitBinaryExpression(' > ');
          break;
        case OP.coerce:
          this.emitCoerce(bc);
          break;
        case OP.coerce_a:
          // NOP.
          break;
        case OP.coerce_i:
        case OP.convert_i:
          this.emitCoerceInt();
          break;
        case OP.coerce_u:
        case OP.convert_u:
          this.emitCoerceUint();
          break;
        case OP.coerce_d:
        case OP.convert_d:
          this.emitCoerceNumber();
          break;
        case OP.coerce_b:
        case OP.convert_b:
          this.emitCoerceBoolean();
          break;
        case OP.coerce_o:
        case OP.convert_o:
          this.emitCoerceObject(bc);
          break;
        case OP.coerce_s:
        case OP.convert_s:
          this.emitCoerceString(bc);
          break;
        case OP.instanceof:
          this.emitInstanceof();
          break;
        case OP.istypelate:
          this.emitIsTypeLate();
          break;
        case OP.astypelate:
          this.emitAsTypeLate();
          break;
        case OP.applytype:
          this.emitApplyType(bc);
          break;
        case OP.in:
          this.emitIn();
          break;
        case OP.typeof:
          this.emitReplace('asTypeOf(' + this.peek() + ')');
          break;
        case OP.dup:
          this.emitDup();
          break;
        case OP.swap:
          this.emitSwap();
          break;
        case OP.returnvoid:
          this.emitReturnVoid();
          break;
        case OP.returnvalue:
          this.emitReturnValue();
          break;
        case OP.debug:
        case OP.debugfile:
        case OP.debugline:
          // Ignored.
          break;
        default:
          throw "Not Implemented: " + OP[op];
      }
    }

    emitLoadLocal(i: number) {
      this.emitPush(this.getLocal(i));
    }

    emitStoreLocal(i: number) {
      this.blockEmitter.writeLn(this.getLocal(i) + " = " + this.pop() + ";");
    }

    emitReplaceLocal(i: number, v: string) {
      this.blockEmitter.writeLn(this.getLocal(i) + " = " + v + ";");
    }

    emitSetProperty(nameIndex: number) {
      var value = this.pop();
      var multiname = this.constantPool.multinames[nameIndex];
      if (!multiname.isRuntime() && multiname.namespaces.length === 1) {
        var qualifiedName = Multiname.qualifyName(multiname.namespaces[0], multiname.name);
        this.blockEmitter.writeLn(this.pop() + '.' + qualifiedName + ' = ' + value + ';');
      } else {
        var nameElements = this.emitMultiname(nameIndex);
        this.blockEmitter.writeLn(this.pop() + ".asSetProperty(" + nameElements + ", " +
                                  value + ");");
      }
    }

    emitSetSuper(nameIndex: number) {
      var value = this.pop();
      var multiname = this.constantPool.multinames[nameIndex];
      if (!multiname.isRuntime() && multiname.namespaces.length === 1) {
        var qualifiedName = Multiname.qualifyName(multiname.namespaces[0], multiname.name);
        if ('s' + qualifiedName in this.methodInfo.classScope.object.baseClass.traitsPrototype) {
          this.emitLine('mi.classScope.object.baseClass.traitsPrototype.s' + qualifiedName +
                        '.call(' + this.pop() + ', ' + value + ');');
        } else {
          // If the base class doesn't have this as a setter, we can just emit a plain property
          // set: if this class overrode the value, then it'd be overridden, period.
          this.emitLine(this.pop() + '.' + qualifiedName + ' = ' + value + ';');
        }
      } else {
        var nameElements = this.emitMultiname(nameIndex);
        this.emitReplace(this.peek() + ".asSetSuper(mi.classScope, " + nameElements + ", " +
                         value + ")");
      }
    }

    emitGetProperty(nameIndex: number) {
      var multiname = this.constantPool.multinames[nameIndex];
      if (!multiname.isRuntime() && multiname.namespaces.length === 1) {
        var qualifiedName = Multiname.qualifyName(multiname.namespaces[0], multiname.name);
        this.emitReplace(this.peek() + '.' + qualifiedName);
      } else {
        var nameElements = this.emitMultiname(nameIndex);
        this.emitReplace(this.peek() + ".asGetProperty(" + nameElements + ", false)");
      }
    }

    emitGetSuper(nameIndex: number) {
      var multiname = this.constantPool.multinames[nameIndex];
      if (!multiname.isRuntime() && multiname.namespaces.length === 1) {
        var qualifiedName = Multiname.qualifyName(multiname.namespaces[0], multiname.name);
        if ('g' + qualifiedName in this.methodInfo.classScope.object.baseClass.traitsPrototype) {
          this.emitReplace('mi.classScope.object.baseClass.traitsPrototype.g' + qualifiedName +
                           '.call(this)');
        } else {
          // If the base class doesn't have this as a getter, we can just emit a plain property
          // get: if this class overrode the value, then it'd be overridden, period.
          this.emitReplace(this.peek() + '.' + qualifiedName);
        }
      } else {
        var nameElements = this.emitMultiname(nameIndex);
        var receiver = this.peek();
        this.emitReplace(receiver + ".asGetSuper(mi.classScope, " + nameElements + ")");
      }
    }

    emitDeleteProperty(nameIndex: number) {
      var multiname = this.constantPool.multinames[nameIndex];
      if (!multiname.isRuntime() && multiname.namespaces.length === 1) {
        var qualifiedName = Multiname.qualifyName(multiname.namespaces[0], multiname.name);
        this.emitReplace('delete ' + this.peek() + '.' + qualifiedName);
      } else {
        var nameElements = this.emitMultiname(nameIndex);
        this.emitReplace(this.peek() + ".asDeleteProperty(" + nameElements + ", false)");
      }
    }

    emitFindProperty(nameIndex: number, strict: boolean) {
      var scope = this.getScope(this.scopeIndex);
      var nameElements = this.emitMultiname(nameIndex);
      this.emitPush(scope + ".findScopeProperty(" + nameElements + ", mi, " + strict + ")");
      return nameElements;
    }

    emitCallProperty(bc: Bytecode) {
      var args = this.popArgs(bc.argCount);
      var receiver;
      var isLex = bc.op === OP.callproplex;
      var nameElements;
      if (isLex) {
        nameElements = this.emitFindProperty(bc.index, true);
        receiver = this.peekScope();
      }
      var call: string;
      var multiname = this.constantPool.multinames[bc.index];
      if (!multiname.isRuntime() && multiname.namespaces.length === 1) {
        var qualifiedName = Multiname.qualifyName(multiname.namespaces[0], multiname.name);
        receiver || (receiver = this.pop());
        call = receiver + '.' + qualifiedName + '(' + args + ')';
      } else {
        if (!nameElements) {
          nameElements = this.emitMultiname(bc.index);
        }
        receiver || (receiver = this.pop());
        call = receiver + ".asCallProperty(" + nameElements + ", " + isLex + ", [" + args + "])";
      }
      if (bc.op !== OP.callpropvoid) {
        this.emitPush(call);
      } else {
        this.blockEmitter.writeLn(call + ';');
      }
    }

    emitCallSuper(bc: Bytecode) {
      var args = this.popArgs(bc.argCount);
      var multiname = this.constantPool.multinames[bc.index];
      // Super calls with statically resolvable names are optimized to direct calls.
      // This must be valid as `asCallSuper` asserts that the method can be found. (Which in
      // itself is invalid, as an incorrect, but valid script can create this situation.)
      if (!multiname.isRuntime() && multiname.namespaces.length === 1) {
        var qualifiedName = 'm' + Multiname.qualifyName(multiname.namespaces[0], multiname.name);
        call = 'mi.classScope.object.baseClass.traitsPrototype.' + qualifiedName +
               '.call(' + this.peek() + (args.length ? ', ' + args : '') + ')';
      }
      if (!call) {
        var nameElements = this.emitMultiname(bc.index);
        var call = this.peek() + '.asCallSuper(mi.classScope, ' + nameElements + ', [' + args +
                                                                                              '])';
      }
      if (bc.op !== OP.callsupervoid) {
        this.emitReplace(call);
      } else {
        this.blockEmitter.writeLn(call + ';');
      }
    }

    emitCall(bc: Bytecode) {
      var args = this.popArgs(bc.argCount);
      var argsString = args.length ? ', ' + args.join(', ') : '';
      var receiver = this.pop();
      var callee = this.peek();
      this.emitReplace(callee + '.asCall(' + receiver + argsString + ')');
    }

    emitConstruct(bc: Bytecode) {
      var args = this.popArgs(bc.argCount);
      var ctor = this.peek();
      this.emitReplace('new ' + ctor + '.instanceConstructor(' + args + ')');
    }

    emitConstructProperty(bc: Bytecode) {
      var args = this.popArgs(bc.argCount);
      this.emitGetProperty(bc.index);
      var val = this.peek();
      this.blockEmitter.writeLn(val + ' = new ' + val + '.instanceConstructor(' + args + ');');
    }

    emitGetLex(nameIndex: number) {
      var nameElements = this.emitFindProperty(nameIndex, true);
      var multiname = this.constantPool.multinames[nameIndex];
      if (!multiname.isRuntime() && multiname.namespaces.length === 1) {
        var qualifiedName = Multiname.qualifyName(multiname.namespaces[0], multiname.name);
        this.emitReplace(this.peek() + '.' + qualifiedName);
      } else {
        this.emitReplace(this.peek() + ".asGetProperty(" + nameElements + ", false)");
      }
    }

    emitMultiname(index: number): string {
      var multiname = this.constantPool.multinames[index];
      this.blockEmitter.writeLn('var mn = mi.abc.constantPool.multinames[' + index + ']; // ' +
                                (release ? '' : multiname));
      // Can't handle these yet.
      Debug.assert(!multiname.isRuntimeNamespace());
      if (!multiname.isRuntime()) {
        return 'mn.namespaces, mn.name, mn.flags';
      }
      var name = multiname.isRuntimeName() ? this.pop() : multiname.name;
      return 'mn.namespaces, ' + name + ', mn.flags';
    }

    emitBinaryIf(block: Bytecode, bc: Bytecode, operator: string, negate: boolean) {
      var y = this.pop();
      var x = this.pop();
      var condition = x + " " + operator + " " + y;
      if (negate) {
        condition = "!(" + condition + ")";
      }
      this.emitIf(block, bc, condition);
    }

    emitUnaryIf(block: Bytecode, bc: Bytecode, operator: string) {
      var x = this.pop();
      this.emitIf(block, bc, operator + x);
    }

    emitIf(block: Bytecode, bc: Bytecode, predicate: string) {
      var next = this.bytecodes[bc.position + 1];
      var target = bc.target;
      Relooper.addBranch(block.relooperBlock, next.relooperBlock);
      Relooper.addBranch(block.relooperBlock, target.relooperBlock, predicate);
    }

    emitJump(block: Bytecode, bc: Bytecode) {
      Relooper.addBranch(block.relooperBlock, bc.target.relooperBlock);
    }

    emitHasNext2(bc: Bytecode) {
      var info = 'hasNext' + (this.hasNext2Infos++);
      var object = this.local[bc.object];
      var index = this.local[bc.index];
      this.emitLine(info + '.object = ' + object + ';');
      this.emitLine(info + '.index = ' + index + ';');
      this.emitLine('Object(' + object + ').asHasNext2(' + info + ');');
      this.emitLine(object + ' = ' + info + '.object;');
      this.emitPush(index + ' = ' + info + '.index');
    }

    emitNextName() {
      var index = this.pop();
      this.emitReplace(this.peek() + '.asNextName(' + index + ')');
    }

    emitNextValue() {
      var index = this.pop();
      this.emitReplace(this.peek() + '.asNextValue(' + index + ')');
    }

    emitThrow() {
      this.emitLine('throw ' + this.pop() + ';');
    }

    emitLookupSwitch(block: Bytecode, bc: Bytecode) {
      var x = this.pop();
      // We need some text in the body of the lookup switch block, otherwise the
      // branch condition variable is ignored.
      var branchBlock = Relooper.addBlock("// Lookup Switch", String(x));
      Relooper.addBranch(block.relooperBlock, branchBlock);

      var defaultTarget = bc.targets[bc.targets.length - 1].relooperBlock;
      for (var i = 0; i < bc.targets.length - 1; i++) {
        var target = bc.targets[i].relooperBlock;
        var caseTargetBlock = Relooper.addBlock();
        Relooper.addBranch(branchBlock, caseTargetBlock, "case " + i + ":");
        Relooper.addBranch(caseTargetBlock, target);
      }
      Relooper.addBranch(branchBlock, defaultTarget);
    }

    emitPush(v) {
      var line = this.getStack(this.stack) + " = " + v + ";";
      release || (line += " // push at " + this.stack);
      this.blockEmitter.writeLn(line);
      this.stack++;
    }

    emitReplace(v) {
      var line = this.getStack(this.stack - 1) + " = " + v + ";";
      release || (line += " // replace at " + (this.stack - 1));
      this.blockEmitter.writeLn(line);
    }

    emitLine(v) {
      this.blockEmitter.writeLn(v);
    }

    emitPushDouble(bc) {
      var val = this.constantPool.doubles[bc.index];
      // `String(-0)` gives "0", so to preserve the `-0`, we have to bend over backwards.
      this.emitPush((val === 0 && 1 / val < 0) ? '-0' : val);
    }

    emitPushString(bc) {
      // The property keys for OP.newobject are pushed on the stack. They can't be used in that
      // format, however, for emitting an object literal definition. So we also store the indices
      // of all pushed strings here and redo the lookup in `emitNewObject`.
      this.pushedStrings[this.stack] = bc.index;
      var str = this.constantPool.strings[bc.index];
      // For long strings or ones containing newlines or ", emit a reference instead of the literal.
      if (str.length > 40 || str.indexOf('\n') > -1 || str.indexOf('\r') > -1 ||
          str.indexOf('"') > -1) {
        this.emitPush('mi.abc.constantPool.strings[' + bc.index + ']');
      } else {
        this.emitPush('"' + str + '"');
      }
    }

    emitPushScope(isWith: boolean) {
      var parent = this.getScope(this.scopeIndex);
      var scope = "new Scope(" + parent + ", " + this.pop() + ", " + isWith + ")";
      this.scopeIndex++;
      this.blockEmitter.writeLn(this.getScope(this.scopeIndex) + " = " + scope + ";");
    }

    popScope() {
      this.scopeIndex--;
    }

    emitGetGlobalScope() {
      this.emitPush(this.peekScope() + '.global.object');
    }

    emitGetScopeObject() {
      this.emitPush(this.peekScope() + '.object');
    }

    emitGetSlot(index: number) {
      this.emitReplace('asGetSlot(' + this.peek() + ', ' + index + ')');
    }

    emitSetSlot(index: number) {
      var value = this.pop();
      var object = this.pop();
      this.emitLine('asSetSlot(' + object + ', ' + index + ', '+ value + ')');
    }

    emitNewClass(bc: Bytecode) {
      this.emitPush('createClass(mi.abc.classes[' + bc.index + '], ' + this.pop() + ', ' + this.peekScope() + ')');
    }

    emitNewObject(bc: Bytecode) {
      var properties = [];
      for (var i = 0; i < bc.argCount; i++) {
        var value = this.pop();
        this.pop();
        var key = this.constantPool.strings[this.pushedStrings[this.stack]];
        properties.push((isNumeric(key) ? key : '$Bg' + key) + ': ' + value);
      }
      this.emitPush('{ ' + properties + ' }');
    }

    emitNewArray(bc: Bytecode) {
      var values = [];
      for (var i = 0; i < bc.argCount; i++) {
        values.push(this.pop());
      }
      this.emitPush('[' + values.reverse() + ']');
    }

    emitNewFunction(bc: Bytecode) {
      this.emitPush('createFunction(mi.abc.methods[' + bc.index + '], ' + this.peekScope() +
                    ', true)');
    }

    emitNewCatch(bc: Bytecode) {
      this.emitPush('mi.exceptions[' + bc.index + '].scopeObject');
    }

    emitConstructSuper(bc: Bytecode) {
      var superInvoke = 'mi.classScope.object.baseClass.instanceConstructorNoInitialize.call(';
      var args = this.popArgs(bc.argCount);
      superInvoke += this.pop();
      if (args.length) {
        superInvoke += ', ' + args.join(', ');
      }
      superInvoke += ');';
      this.blockEmitter.writeLn(superInvoke);
    }

    emitCoerce(bc: Bytecode) {
      var multiname = this.constantPool.multinames[bc.index];
      switch (multiname) {
        case Multiname.Int:     return this.emitCoerceInt();
        case Multiname.Uint:    return this.emitCoerceUint();
        case Multiname.Number:  return this.emitCoerceNumber();
        case Multiname.Boolean: return this.emitCoerceBoolean();
        case Multiname.Object:  return this.emitCoerceObject(bc);
        case Multiname.String:  return this.emitCoerceString(bc);
      }
      if (bc.ti && bc.ti.noCoercionNeeded) {
        return;
      }
      var coercion = 'asCoerce(mi.abc.applicationDomain.getType(mi.abc.constantPool.multinames[' +
                     bc.index + ']), ' + this.pop() + ')';
      this.emitPush(coercion);
    }

    emitCoerceInt() {
      var val = this.peek();
      this.blockEmitter.writeLn(val + ' |= 0;');
    }

    emitCoerceUint() {
      var val = this.peek();
      this.blockEmitter.writeLn(val + ' >>>= 0;');
    }

    emitCoerceNumber() {
      var val = this.peek();
      this.blockEmitter.writeLn(val + '= +' + val);
    }

    emitCoerceBoolean() {
      var val = this.peek();
      this.blockEmitter.writeLn(val + ' = !!' + val + ';');
    }

    emitCoerceObject(bc: Bytecode) {
      if (bc.ti && bc.ti.noCoercionNeeded) {
        return;
      }
      var val = this.peek();
      this.blockEmitter.writeLn(val + ' = asCoerceObject(' + val + ');');
    }

    emitCoerceString(bc: Bytecode) {
      if (bc.ti && bc.ti.noCoercionNeeded) {
        return;
      }
      var val = this.peek();
      this.blockEmitter.writeLn(val + ' = asCoerceString(' + val + ');');
    }

    emitInstanceof() {
      var type = this.pop();
      this.emitReplace(type + '.isInstanceOf(' + this.peek() + ')');
    }

    emitIsTypeLate() {
      var type = this.pop();
      this.emitReplace('asIsType(' + type + ', ' + this.peek() + ')');
    }

    emitAsTypeLate() {
      var type = this.pop();
      this.emitReplace('asAsType(' + type + ', ' + this.peek() + ')');
    }

    emitApplyType(bc: Bytecode) {
      var args = this.popArgs(bc.argCount);
      var type = this.peek();
      this.emitReplace('applyType(mi, ' + type + ', [' + args + '])');
    }

    emitIn() {
      var object = this.pop();
      var key = '$Bg' + this.peek();
      this.emitReplace(key + ' in ' + object);
    }

    emitDup() {
      this.emitPush(this.peek());
    }

    emitSwap() {
      var top = this.getStack(this.stack - 1);
      var next = this.getStack(this.stack - 2);
      this.blockEmitter.writeLn("var $t = " + top + ";");
      this.blockEmitter.writeLn(top + " = " + next + ";");
      this.blockEmitter.writeLn(next + " = $t;");
    }

    emitEquals() {
      var right = this.pop();
      this.emitReplace('asEquals(' + this.peek() + ', ' + right + ')');
    }

    emitUnaryOp(operator: string) {
      this.emitReplace(operator + this.peek());
    }

    emitUnaryOp_i(operator: string) {
      this.emitReplace(operator + this.peek() + '|0');
    }

    emitAddExpression() {
      var right = this.pop();
      var left = this.peek();
      this.blockEmitter.writeLn(left + ' = asAdd(' + left + ', ' + right + ');');
    }

    emitAddExpression_i() {
      var right = this.pop();
      var left = this.peek();
      this.blockEmitter.writeLn(left + ' = asAdd(' + left + ', ' + right + ')|0;');
    }

    emitBinaryExpression(expression: string) {
      var right = this.pop();
      var left = this.peek();
      this.blockEmitter.writeLn(left + ' = ' + left + expression + right + ';');
    }

    emitBinaryExpression_i(expression: string) {
      var right = this.pop();
      var left = this.peek();
      this.blockEmitter.writeLn(left + ' = ' + left + expression + right + '|0;');
    }

    emitReturnVoid() {
      this.blockEmitter.writeLn('return;');
    }

    emitReturnValue() {
      var value = this.pop();
      if (this.methodInfo.returnType) {
        switch (Multiname.getQualifiedName(this.methodInfo.returnType)) {
          case Multiname.Int: value += '|0'; break;
          case Multiname.Uint: value += ' >>> 0'; break;
          case Multiname.String: value = 'asCoerceString(' + value + ')'; break;
          case Multiname.Number: value = '+' + value; break;
          case Multiname.Boolean: value = '!!' + value; break;
          case Multiname.Object: value = 'Object(' + value + ')'; break;
          default:
            value = 'asCoerce(mi.abc.applicationDomain.getType(mi.returnType), ' + value + ')';
        }
      }
      this.blockEmitter.writeLn('return ' + value + ';');
    }

    popArgs(count: number): string[] {
      var args = [];
      var end = this.stack;
      var start = end - count;
      for (var i = start; i < end; i++) {
        args.push(this.getStack(i));
      }
      this.stack = start;
      return args;
    }
  }

  export function baselineCompileMethod(methodInfo: MethodInfo, scope: Scope,
                                        hasDynamicScope: boolean, globalMiName: string) {
    var compiler = new BaselineCompiler(methodInfo, scope, hasDynamicScope, globalMiName);
    try {
      var result = compiler.compile();
    } catch (e) {
      failCompileCount++;
      writer && writer.errorLn("Error: " + e);
    }
    return result;
  }

  export function baselineCompileABC(abc: AbcFile) {
    abc.methods.forEach(function (method) {
      if (!method.code) {
        return;
      }
      baselineCompileMethod(method, null, false, '');
    });
  }
}
