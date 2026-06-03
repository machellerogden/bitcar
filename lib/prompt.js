process.env.INQUIRER_KEYBINDINGS ??= 'vim';

import { input, confirm, checkbox, select, password } from '@inquirer/prompts';

export default { input, confirm, checkbox, select, password };
