import { test, expect } from './_setup';

test('GetSeedsNeeded - Todos los intents', async ({ runAutoLoop, intents, conversation }) => {
  const fails: string[] = [];
  const list = intents.getSeedsNeeded;
  
  for (let i = 0; i < list.length; i++) {
    const starter = list[i];
    conversation.logIntent(`[${i + 1}/${list.length}] ${starter}`, i + 1, list.length);
    
    const result = await runAutoLoop(starter, { resetChat: true });
    if (!result.success) {
      fails.push(`Intent "${starter}" falló: ${result.reason}`);
    }
  }
  
  expect.soft(fails, fails.join('\\n')).toHaveLength(0);
});
