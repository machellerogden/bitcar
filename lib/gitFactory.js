import { simpleGit } from 'simple-git';

export default {
    getInstance: (workspaceDir, streamOutput = true) => {
        return simpleGit(workspaceDir).outputHandler((command, stdout, stderr) => {
            if (streamOutput) {
                stdout.pipe(process.stdout);
                stderr.pipe(process.stderr);
            }
        });
    }
};
