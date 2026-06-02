import path from 'node:path';
import fs from 'node:fs';

export function getWorkspaceDir() {
    const envWorkspaceDir = process.env.BITCAR_WORKSPACE_DIR;
    const defaultWorkspaceDir = `${process.env.HOME}/bitcar-repos`;
    const workspaceDir = envWorkspaceDir
        ? path.normalize(envWorkspaceDir)
        : path.normalize(defaultWorkspaceDir);

    if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
    }

    return workspaceDir;
}

export default getWorkspaceDir;
