// Babylon loads shader code with a dynamic import() the first time a material needs it. Left like that, the first
// appearance of every material would also pay for fetching a chunk, which is network time, not the shader
// compile and link this demo is about. Importing the modules statically puts them in the main bundle, so the
// dynamic import resolves from memory in both modes.
import '@babylonjs/core/Shaders/default.vertex';
import '@babylonjs/core/Shaders/default.fragment';
import '@babylonjs/core/Shaders/pbr.vertex';
import '@babylonjs/core/Shaders/pbr.fragment';
import '@babylonjs/core/Shaders/shadowMap.vertex';
import '@babylonjs/core/Shaders/shadowMap.fragment';
