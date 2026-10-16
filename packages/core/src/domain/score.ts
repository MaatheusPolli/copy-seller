export interface CriterionScore {
  criterion: string;
  score: number;
  justification: string;
}

export interface JudgeResult {
  scores: CriterionScore[];
  overall: number;
}
