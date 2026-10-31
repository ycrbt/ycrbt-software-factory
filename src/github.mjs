const ownerRepo = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export function validateIssue(issue) {
  if (!issue || !Number.isSafeInteger(issue.number) || issue.number <= 0) throw new Error('Issue must have a positive integer number');
  if (typeof issue.title !== 'string' || !issue.title.trim()) throw new Error('Issue has no title');
  const labels = (issue.labels || []).map(label => typeof label === 'string' ? label : label?.name);
  if (!labels.includes('factory-ready')) throw new Error('Issue is not labeled factory-ready');
  if (issue.authorType !== 'User' || issue.pull_request) throw new Error('Only human-created issues are eligible (not bots/PRs)');
  return { number: issue.number, title: issue.title, body: String(issue.body ?? ''), labels, authorType: 'User', html_url: issue.html_url ?? null };
}

function endpoint(repo, suffix) {
  if (!ownerRepo.test(repo)) throw new Error('GitHub repository must be OWNER/REPO');
  return 'https://api.github.com/repos/' + repo + '/' + suffix;
}

export async function githubRequest(url, token = process.env.GITHUB_TOKEN, fetchImpl = fetch) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'agentic-frontend-factory' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('GitHub API request failed (' + response.status + '); verify repo access and GITHUB_TOKEN');
  return response.json();
}

export async function fetchIssue(repo, number, requester = githubRequest) {
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Invalid issue number');
  const issue = await requester(endpoint(repo, 'issues/' + number));
  return validateIssue({ ...issue, authorType: issue.user?.type });
}

export async function scanIssues(repo, requester = githubRequest) {
  const issues = await requester(endpoint(repo, 'issues?labels=factory-ready&state=open&per_page=100'));
  if (!Array.isArray(issues)) throw new Error('Expected issues list');
  return issues.flatMap(issue => {
    try { return [validateIssue({ ...issue, authorType: issue.user?.type })]; }
    catch { return []; }
  });
}
