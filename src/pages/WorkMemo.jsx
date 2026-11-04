import WorkspaceBoard from './WorkspaceBoard.jsx';
import { initialMemos } from '../lib/initialMemos.js';

export default function WorkMemo() {
  return <WorkspaceBoard collection="memos" defaults={initialMemos} />;
}
