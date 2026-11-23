import {
  OperationError,
  createReportFailure,
} from '@feed/core/utils/operation-error';
import { showToast } from '@/utils/toast';

export { OperationError };
export const reportFailure = createReportFailure({
  appName: 'RuliFeed',
  showToast,
});
