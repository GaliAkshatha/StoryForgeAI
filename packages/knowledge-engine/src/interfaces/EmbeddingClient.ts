export interface EmbeddingClient {

    embed(
        text: string
    ): Promise<number[]>;

    embedBatch(
        texts: string[]
    ): Promise<number[][]>;

}
