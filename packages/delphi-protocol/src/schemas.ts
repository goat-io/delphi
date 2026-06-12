import { z } from 'zod'

export const LeafKindSchema = z.enum([
  'OBJECT',
  'EVIDENCE',
  'BELIEF',
  'QUESTION',
  'DECISION',
  'TASK',
  'RUBRIC',
  'CAPABILITY',
  'METHODOLOGY',
  'WORK',
  'EXPRESSION',
  'ASSET',
  'ONTOLOGY_TYPE',
  'RELATIONSHIP_TYPE',
  'VALIDATION_RULE',
  'EVALUATION',
])
export type LeafKind = z.infer<typeof LeafKindSchema>

export const LeafStatusSchema = z.enum([
  'DRAFT',
  'PROPOSED',
  'ACTIVE',
  'DISPUTED',
  'REFUTED',
  'SUPERSEDED',
  'ARCHIVED',
])
export type LeafStatus = z.infer<typeof LeafStatusSchema>

export const ConfidenceSchema = z.object({
  value: z.number().min(0).max(1),
  evidenceStrength: z.number().min(0).max(1),
  sourceReliability: z.number().min(0).max(1),
  sourceDiversity: z.number().min(0).max(1),
  freshness: z.number().min(0).max(1),
  consensus: z.number().min(0).max(1),
  contradictionRisk: z.number().min(0).max(1),
  explanation: z.string().optional(),
})
export type Confidence = z.infer<typeof ConfidenceSchema>

export const LeafSchema = z.object({
  id: z.string(),
  brainId: z.string(),
  kind: LeafKindSchema,
  status: LeafStatusSchema,
  title: z.string().min(1),
  summary: z.string().optional(),
  statement: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  confidence: ConfidenceSchema.optional(),
  regionId: z.string().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  version: z.number().int().min(1).default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Leaf = z.infer<typeof LeafSchema>

export const EdgeTypeSchema = z.enum([
  'SUPPORTS',
  'CONTRADICTS',
  'DEPENDS_ON',
  'DERIVED_FROM',
  'CITES',
  'REFERENCES',
  'EVALUATES',
  'REQUIRES_RESEARCH',
  'SUPERSEDES',
  'IS_A',
  'PART_OF',
  'RELATES_TO',
])
export type EdgeType = z.infer<typeof EdgeTypeSchema>

export const RelationshipSchema = z.object({
  id: z.string(),
  brainId: z.string(),
  sourceLeafId: z.string(),
  targetLeafId: z.string(),
  type: EdgeTypeSchema,
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
})
export type Relationship = z.infer<typeof RelationshipSchema>

export const AssetTypeSchema = z.enum([
  'MARKDOWN',
  'TEXT',
  'PDF',
  'WEBPAGE',
  'VIDEO',
  'AUDIO',
  'REPOSITORY',
])
export type AssetType = z.infer<typeof AssetTypeSchema>

export const AssetSchema = z.object({
  id: z.string(),
  brainId: z.string(),
  type: AssetTypeSchema,
  title: z.string(),
  uri: z.string(),
  checksum: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
})
export type Asset = z.infer<typeof AssetSchema>

export const ChunkSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  ordinal: z.number().int().min(0),
  text: z.string(),
  location: z
    .object({
      section: z.string().optional(),
      page: z.number().int().optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
})
export type Chunk = z.infer<typeof ChunkSchema>

export const EvidenceRelationSchema = z.enum([
  'SUPPORTS',
  'CONTRADICTS',
  'MENTIONS',
  'INTERPRETS',
])
export type EvidenceRelation = z.infer<typeof EvidenceRelationSchema>

export const EvidenceRefSchema = z.object({
  id: z.string(),
  brainId: z.string(),
  leafId: z.string(),
  assetId: z.string(),
  chunkId: z.string().optional(),
  citation: z.string().optional(),
  relation: EvidenceRelationSchema,
  strength: z.number().min(0).max(1),
  extractionConfidence: z.number().min(0).max(1),
  createdAt: z.string(),
})
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>

export const CandidateKindSchema = z.enum(['OBJECT', 'BELIEF', 'QUESTION'])
export type CandidateKind = z.infer<typeof CandidateKindSchema>

export const CandidateSchema = z.object({
  id: z.string(),
  kind: CandidateKindSchema,
  title: z.string().min(1),
  statement: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  extractionConfidence: z.number().min(0).max(1),
  assetId: z.string(),
  chunkId: z.string(),
  sourceText: z.string(),
})
export type Candidate = z.infer<typeof CandidateSchema>

export const ResolutionOutcomeSchema = z.enum([
  'MERGED',
  'CREATED',
  'LINKED',
  'FLAGGED',
])
export type ResolutionOutcome = z.infer<typeof ResolutionOutcomeSchema>

export const ResolutionSchema = z.object({
  outcome: ResolutionOutcomeSchema,
  candidateId: z.string(),
  leafId: z.string().optional(),
  matchedLeafId: z.string().optional(),
  similarity: z.number().optional(),
  rationale: z.string().optional(),
})
export type Resolution = z.infer<typeof ResolutionSchema>

export const RegionSchema = z.object({
  id: z.string(),
  brainId: z.string(),
  title: z.string(),
  kind: z.enum(['SEEDED', 'HUB']),
  anchorLeafId: z.string().optional(),
  createdAt: z.string(),
})
export type Region = z.infer<typeof RegionSchema>

export const KnowledgeIndexSchema = z.object({
  id: z.string(),
  brainId: z.string(),
  regionId: z.string(),
  title: z.string(),
  summaryTiny: z.string(),
  summaryShort: z.string(),
  summaryMedium: z.string(),
  summaryLong: z.string(),
  keyConcepts: z.array(z.string()),
  keyBeliefs: z.array(z.string()),
  keyQuestions: z.array(z.string()),
  representativeLeafIds: z.array(z.string()),
  stale: z.boolean(),
  changedLeafCount: z.number().int(),
  generatedAt: z.string(),
})
export type KnowledgeIndex = z.infer<typeof KnowledgeIndexSchema>

export const MapRouteSchema = z.object({
  id: z.string(),
  title: z.string(),
  purpose: z.enum(['LEARNING', 'DEPENDENCY', 'EXPLORATION']),
  nodeLeafIds: z.array(z.string()),
})
export type MapRoute = z.infer<typeof MapRouteSchema>

export const KnowledgeMapSchema = z.object({
  id: z.string(),
  brainId: z.string(),
  title: z.string(),
  routes: z.array(MapRouteSchema),
  generatedAt: z.string(),
})
export type KnowledgeMap = z.infer<typeof KnowledgeMapSchema>

export const LeafEventSchema = z.object({
  id: z.string(),
  brainId: z.string(),
  leafId: z.string(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
})
export type LeafEvent = z.infer<typeof LeafEventSchema>

export const BrainSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string(),
})
export type Brain = z.infer<typeof BrainSchema>

export const AnswerEvidenceSchema = z.object({
  leafId: z.string(),
  leafTitle: z.string(),
  assetTitle: z.string(),
  citation: z.string().optional(),
  strength: z.number().min(0).max(1),
})
export type AnswerEvidence = z.infer<typeof AnswerEvidenceSchema>

export const AnswerResultSchema = z.object({
  question: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  navigationPath: z.array(z.string()),
  beliefs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      statement: z.string().optional(),
      confidence: z.number().optional(),
    }),
  ),
  evidence: z.array(AnswerEvidenceSchema),
  dependencies: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: EdgeTypeSchema,
    }),
  ),
  contradictions: z.array(
    z.object({
      a: z.string(),
      b: z.string(),
    }),
  ),
})
export type AnswerResult = z.infer<typeof AnswerResultSchema>
