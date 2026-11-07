import React, {useContext, useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {Button, Divider, Switch, Text} from 'react-native-paper';
import {observer} from 'mobx-react';
import {useNavigation} from '@react-navigation/native';

import {useTheme} from '../../hooks';
import {uiStore} from '../../store';
import {L10nContext} from '../../utils';
import {ROUTES} from '../../utils/navigationConstants';
import {registerDefaultTalents, talentRegistry} from '../../services/talents';

export const ToolsScreen = observer(() => {
  const theme = useTheme();
  const l10n = useContext(L10nContext);
  const navigation = useNavigation<any>();
  const engines = useMemo(() => {
    registerDefaultTalents();
    return talentRegistry.getAll();
  }, []);
  const names = l10n.components.palSheet.talentNames;
  const descriptions = l10n.components.palSheet.talentDescriptions;

  return (
    <ScrollView
      testID="tools-screen"
      style={{backgroundColor: theme.colors.background}}
      contentContainerStyle={styles.container}>
      <Text variant="bodyLarge" style={{color: theme.colors.onSurfaceVariant}}>
        {l10n.toolsScreen.description}
      </Text>
      {engines.map(engine => {
        const name = names[engine.name as keyof typeof names] ?? engine.name;
        return (
          <View key={engine.name}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text variant="titleMedium">{name}</Text>
                <Text
                  variant="bodyMedium"
                  style={{color: theme.colors.onSurfaceVariant}}>
                  {descriptions[engine.name as keyof typeof descriptions] ??
                    engine.toToolDefinition().function.description}
                </Text>
              </View>
              <Switch
                testID={`tool-switch-${engine.name}`}
                accessibilityLabel={name}
                value={uiStore.enabledTools.includes(engine.name)}
                onValueChange={enabled =>
                  uiStore.setToolEnabled(engine.name, enabled)
                }
              />
            </View>
            <Divider />
          </View>
        );
      })}
      <Text variant="bodyMedium" style={styles.note}>
        {l10n.toolsScreen.searchHint}
      </Text>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate(ROUTES.SETTINGS)}>
        {l10n.toolsScreen.searchSettings}
      </Button>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {padding: 20, paddingBottom: 40},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  info: {flex: 1, gap: 6},
  note: {marginTop: 24, marginBottom: 16},
});
