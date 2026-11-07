import {chatSessionStore, defaultCompletionSettings} from '../ChatSessionStore';
import {palStore} from '../PalStore';
import {uiStore} from '../UIStore';
import {deriveToolSchemas} from '../../services/talents';
import type {ToolDefinition} from '../../services/talents';
import type {CompletionParams} from '../../utils/completionTypes';
import {bodyExtras} from '../../api/servers';

const toolNames = (settings: CompletionParams) =>
  ((settings.tools ?? []) as ToolDefinition[]).map(tool => tool.function.name);

describe('ChatSessionStore global tools', () => {
  beforeEach(() => {
    chatSessionStore.sessions = [];
    chatSessionStore.activeSessionId = null;
    chatSessionStore.newChatPalId = undefined;
    chatSessionStore.newChatCompletionSettings = {...defaultCompletionSettings};
    chatSessionStore.newChatThinkingOverride = undefined;
    chatSessionStore.newChatReasoningEffort = undefined;
    uiStore.enabledTools = ['web_search', 'read_url', 'datetime'];
    palStore.pals = [];
  });

  it('enables only search, reading and date/time in a new chat', async () => {
    const result = await chatSessionStore.getCurrentCompletionSettings();
    expect(toolNames(result).sort()).toEqual([
      'datetime',
      'read_url',
      'web_search',
    ]);
  });

  it('retains the global generation settings', async () => {
    chatSessionStore.newChatCompletionSettings.temperature = 0.8;
    const result = await chatSessionStore.getCurrentCompletionSettings();
    expect(result.temperature).toBe(0.8);
  });

  it('ignores legacy Pal generation settings and tool selections', async () => {
    palStore.pals.push({
      id: 'legacy',
      type: 'local',
      name: 'Legacy Pal',
      systemPrompt: 'Old persona',
      isSystemPromptChanged: false,
      useAIPrompt: false,
      parameters: {},
      parameterSchema: [],
      completionSettings: {...defaultCompletionSettings, temperature: 0.1},
      pact: {talents: [{name: 'calculate', necessity: 'required'}]},
      source: 'local',
    });
    chatSessionStore.newChatCompletionSettings.temperature = 0.8;
    chatSessionStore.newChatPalId = 'legacy';
    const result = await chatSessionStore.resolveCompletionSettings(
      undefined,
      'legacy',
    );
    expect(result.temperature).toBe(0.8);
    expect(toolNames(result)).not.toContain('calculate');
    expect(chatSessionStore.activePalId).toBeUndefined();
  });

  it('keeps custom session parameters and replaces its saved tool schemas', async () => {
    chatSessionStore.sessions = [
      {
        id: 'existing',
        title: 'Old conversation',
        date: '2026-11-08',
        messages: [],
        settingsSource: 'custom',
        activePalId: 'legacy',
        completionSettings: {
          ...defaultCompletionSettings,
          temperature: 0.3,
          tools: deriveToolSchemas(['calculate']),
        },
      },
    ];
    chatSessionStore.activeSessionId = 'existing';
    const result = await chatSessionStore.getCurrentCompletionSettings();
    expect(result.temperature).toBe(0.3);
    expect(toolNames(result)).not.toContain('calculate');
    expect(toolNames(result)).toContain('web_search');
    expect(chatSessionStore.activePalId).toBeUndefined();

    uiStore.setToolEnabled('calculate', true);
    uiStore.setToolEnabled('web_search', false);
    const changed = await chatSessionStore.getCurrentCompletionSettings();
    expect(toolNames(changed)).toContain('calculate');
    expect(toolNames(changed)).not.toContain('web_search');
  });

  it('removes stale schemas and tool choice when all tools are off', async () => {
    chatSessionStore.newChatCompletionSettings.tools = deriveToolSchemas();
    chatSessionStore.newChatCompletionSettings.tool_choice = 'auto';
    uiStore.enabledTools = [];
    const result = await chatSessionStore.getCurrentCompletionSettings();
    expect(result.tools).toBeUndefined();
    expect(result.tool_choice).toBeUndefined();
    // Resolving a request must not mutate persisted user settings.
    expect(chatSessionStore.newChatCompletionSettings.tools).toHaveLength(5);
  });

  it('keeps an unknown persisted tool from becoming available', async () => {
    uiStore.enabledTools = ['unknown', 'datetime'];
    const result = await chatSessionStore.getCurrentCompletionSettings();
    expect(toolNames(result)).toEqual(['datetime']);
  });

  it.each([true, false])(
    'retains a new chat thinking override: %s',
    async enabled => {
      chatSessionStore.newChatThinkingOverride = enabled;
      const result = await chatSessionStore.getCurrentCompletionSettings();
      expect(result.enable_thinking).toBe(enabled);
      expect(result.reasoning?.enabled).toBe(enabled);
      expect(toolNames(result)).toHaveLength(3);
    },
  );

  it('carries the thinking OFF intent to both remote server formats', async () => {
    chatSessionStore.newChatThinkingOverride = false;
    const result = await chatSessionStore.getCurrentCompletionSettings();
    expect(
      bodyExtras('llama.cpp', {samplers: {}, reasoning: result.reasoning}),
    ).toEqual({
      reasoning_format: 'auto',
      chat_template_kwargs: {enable_thinking: false},
    });
    expect(
      bodyExtras('Ollama', {samplers: {}, reasoning: result.reasoning}),
    ).toEqual({
      reasoning_effort: 'none',
    });
  });
});
