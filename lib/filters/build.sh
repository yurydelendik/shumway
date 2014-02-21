emcc -O2 src/filters.c -o filters.raw.js -s EXPORTED_FUNCTIONS="['_allocMemory', '_freeMemory', '_preMultiplyAlpha','_unpreMultiplyAlpha','_blur','_dropshadow','_colormatrix']"
cat src/filters.pre.js > filters.js
cat filters.raw.js >> filters.js
cat src/filters.post.js >> filters.js
rm filters.raw.js
node ./cut.js > filters3.js
