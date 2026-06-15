import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MoveFile {
  path: string;
  name: string;
  size: number;
  downloadUrl: string;
}

export interface RepoInfo {
  owner: string;
  name: string;
  defaultBranch: string;
  commitSha: string;
  moveFiles: MoveFile[];
}

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly githubToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.githubToken = this.configService.get<string>('GITHUB_TOKEN');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'MoveAuditor/1.0',
    };
    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
    }
    return headers;
  }

  parseRepoUrl(url: string): { owner: string; name: string } {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (!match) {
      throw new BadRequestException('Invalid GitHub repository URL');
    }
    return { owner: match[1], name: match[2].replace(/\.git$/, '') };
  }

  async scanRepository(repoUrl: string, includeTests: boolean = false): Promise<RepoInfo> {
    const { owner, name } = this.parseRepoUrl(repoUrl);

    // Get repo metadata
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: this.getHeaders(),
    });
    if (!repoRes.ok) {
      throw new BadRequestException(`GitHub API error: ${repoRes.status} ${repoRes.statusText}`);
    }
    const repoData = await repoRes.json() as any;
    const defaultBranch = repoData.default_branch;

    // Get file tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${name}/git/trees/${defaultBranch}?recursive=1`,
      { headers: this.getHeaders() },
    );
    if (!treeRes.ok) {
      throw new BadRequestException(`GitHub Tree API error: ${treeRes.status}`);
    }
    const treeData = await treeRes.json() as any;

    // Filter for .move files under 100KB
    let moveFiles: MoveFile[] = (treeData.tree || [])
      .filter((item: any) => item.type === 'blob' && item.path.endsWith('.move') && (item.size || 0) < 100_000)
      .map((item: any) => ({
        path: item.path,
        name: item.path.split('/').pop() || item.path,
        size: item.size || 0,
        downloadUrl: `https://raw.githubusercontent.com/${owner}/${name}/${defaultBranch}/${item.path}`,
      }));

    // Optionally filter out test files
    if (!includeTests) {
      moveFiles = moveFiles.filter((f: MoveFile) => {
        const lowerPath = f.path.toLowerCase();
        return (
          !lowerPath.includes('/tests/') &&
          !lowerPath.includes('/test/') &&
          !lowerPath.endsWith('_test.move') &&
          !lowerPath.endsWith('_tests.move')
        );
      });
    }

    if (moveFiles.length === 0) {
      throw new BadRequestException('No Move (.move) files found in this repository');
    }
    if (moveFiles.length > 170) {
      throw new BadRequestException(`Too many Move files (${moveFiles.length}). Maximum is 50.`);
    }

    // Get latest commit SHA
    const commitSha = repoData.sha || treeData.sha || '';

    this.logger.log(`Scanned ${owner}/${name}: found ${moveFiles.length} Move files`);

    return {
      owner,
      name,
      defaultBranch,
      commitSha,
      moveFiles,
    };
  }

  async fetchFileContent(downloadUrl: string): Promise<string> {
    const res = await fetch(downloadUrl, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch file: ${res.status}`);
    }
    return res.text();
  }

  async fetchAllMoveFiles(moveFiles: MoveFile[]): Promise<{ file: MoveFile; content: string }[]> {
    const results: { file: MoveFile; content: string }[] = [];
    const batchSize = 5;

    for (let i = 0; i < moveFiles.length; i += batchSize) {
      const batch = moveFiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          const content = await this.fetchFileContent(file.downloadUrl);
          return { file, content };
        }),
      );
      results.push(...batchResults);
    }

    return results;
  }
}
