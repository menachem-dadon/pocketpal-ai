import React from 'react';
import {act, fireEvent, render} from '../../../../jest/test-utils';
import {uiStore} from '../../../store';
import {ToolsScreen} from '../ToolsScreen';

describe('ToolsScreen', () => {
  beforeEach(() => {
    uiStore.enabledTools = ['web_search', 'read_url', 'datetime'];
  });

  it('shows every registered tool with the initial global choices', () => {
    const {getByTestId} = render(<ToolsScreen />, {withNavigation: true});
    for (const name of ['web_search', 'read_url', 'datetime']) {
      expect(getByTestId(`tool-switch-${name}`).props.value).toBe(true);
    }
    for (const name of ['calculate', 'render_html']) {
      expect(getByTestId(`tool-switch-${name}`).props.value).toBe(false);
    }
  });

  it('updates global choices when a tool is enabled or disabled', () => {
    const {getByTestId} = render(<ToolsScreen />, {withNavigation: true});
    act(() => {
      fireEvent(getByTestId('tool-switch-calculate'), 'valueChange', true);
      fireEvent(getByTestId('tool-switch-web_search'), 'valueChange', false);
    });
    expect(uiStore.enabledTools).toContain('calculate');
    expect(uiStore.enabledTools).not.toContain('web_search');
    expect(getByTestId('tool-switch-calculate').props.value).toBe(true);
    expect(getByTestId('tool-switch-web_search').props.value).toBe(false);
  });
});
