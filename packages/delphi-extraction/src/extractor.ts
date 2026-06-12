import type { Candidate, Chunk } from '@goatlab/delphi-protocol'

export interface Extractor {
  extract(
    chunk: Chunk,
    assetId: string,
    assetTitle: string,
  ): Promise<Candidate[]>
  readonly name: string
}
