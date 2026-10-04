/** Embedding model shared by the build script and the app; changing it requires rebuilding seed vectors. */
export const EMBED_MODEL_ID = 'Xenova/multilingual-e5-small';
export const EMBED_DTYPE = 'q8';
/** e5 models expect this prefix on every input for symmetric similarity. */
export const EMBED_PREFIX = 'query: ';
