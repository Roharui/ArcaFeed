import type {
  Condition as CoreCondition,
  ConditionFuncResult,
  MethodKeys,
  PromiseFunc as CorePromiseFunc,
  PromiseFuncResult as CorePromiseFuncResult,
} from '@feed/core/types/func';
import type { VaultAdapter } from '@/vault';

type PromiseFuncResult = CorePromiseFuncResult<VaultAdapter>;
type Condition = CoreCondition<VaultAdapter>;
type PromiseFunc = CorePromiseFunc<VaultAdapter>;

export type {
  PromiseFunc,
  PromiseFuncResult,
  Condition,
  ConditionFuncResult,
  MethodKeys,
};
