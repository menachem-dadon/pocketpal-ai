import React, {useRef, useContext, useEffect} from 'react';
import {View, Pressable, Keyboard} from 'react-native';
import {observer} from 'mobx-react';
import {Text} from 'react-native-paper';
import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';

import {useTheme} from '../../hooks';
import {createStyles} from './styles';
import {modelStore} from '../../store';
import {CustomBackdrop} from '../Sheet/CustomBackdrop';
import {SheetBackground} from '../Sheet/SheetBackground';
import {getModelSkills, L10nContext, Model} from '../../utils';
import {SkillsDisplay} from '../SkillsDisplay';

interface ChatPalModelPickerSheetProps {
  isVisible: boolean;
  chatInputHeight: number;
  onClose: () => void;
  onModelSelect?: (modelId: string) => void;
}

const ObservedSkillsDisplay = observer(({model}) => {
  const hasProjectionModelWarning =
    model.supportsMultimodal &&
    model.visionEnabled &&
    modelStore.getProjectionModelStatus(model).state === 'missing';

  const toggleVision = async () => {
    if (!model.supportsMultimodal) {
      return;
    }
    try {
      await modelStore.setModelVisionEnabled(
        model.id,
        !modelStore.getModelVisionPreference(model),
      );
    } catch (error) {
      console.error('Failed to toggle vision setting:', error);
      // The error is already handled in setModelVisionEnabled (vision state is reverted)
      // We could show a toast/snackbar here if needed
    }
  };
  const visionEnabled = modelStore.getModelVisionPreference(model);

  return (
    <SkillsDisplay
      model={model}
      hasProjectionModelWarning={hasProjectionModelWarning}
      onVisionPress={toggleVision}
      onProjectionWarningPress={() =>
        model.defaultProjectionModel &&
        modelStore.checkSpaceAndDownload(model.defaultProjectionModel)
      }
      visionEnabled={visionEnabled}
    />
  );
});

export const ChatPalModelPickerSheet = observer(
  ({
    isVisible,
    onClose,
    onModelSelect,
    chatInputHeight,
  }: ChatPalModelPickerSheetProps) => {
    const theme = useTheme();
    const l10n = useContext(L10nContext);
    const styles = createStyles({theme});
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = React.useMemo(() => ['70%'], []);
    // Dismiss keyboard when sheet becomes visible
    useEffect(() => {
      if (isVisible) {
        Keyboard.dismiss();
      }
    }, [isVisible]);

    // Close sheet when keyboard opens
    useEffect(() => {
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => {
          if (isVisible) {
            onClose();
          }
        },
      );

      return () => {
        keyboardDidShowListener.remove();
      };
    }, [isVisible, onClose]);

    const handleModelSelect = React.useCallback(
      async (model: (typeof modelStore.availableModels)[0]) => {
        try {
          onModelSelect?.(model.id);
          onClose();
          modelStore.selectModel(model);
        } catch (e) {
          console.log(`Error: ${e}`);
        }
      },
      [onModelSelect, onClose],
    );

    const renderModelItem = React.useCallback(
      (model: Model) => {
        const isActiveModel = model.id === modelStore.activeModelId;
        const modelSkills = getModelSkills(model)
          .flatMap(skill => skill.labelKey)
          .join(', ');
        return (
          <Pressable
            key={model.id}
            style={[styles.listItem, isActiveModel && styles.activeListItem]}
            onPress={() => handleModelSelect(model)}>
            <View style={styles.itemContent}>
              <Text
                style={[
                  styles.itemTitle,
                  isActiveModel && styles.activeItemTitle,
                ]}>
                {model.name}
              </Text>
              {modelSkills && <ObservedSkillsDisplay model={model} />}
            </View>
          </Pressable>
        );
      },
      [styles, handleModelSelect],
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        onClose={onClose}
        enablePanDownToClose
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backdropComponent={isVisible ? CustomBackdrop : undefined}
        backgroundComponent={SheetBackground}
        backgroundStyle={{backgroundColor: theme.colors.background}}
        handleIndicatorStyle={{backgroundColor: theme.colors.primary}}
        enableContentPanningGesture={false}
        enableHandlePanningGesture
        accessible={false}>
        <Text style={styles.title}>
          {l10n.components.chatPalModelPickerSheet.modelsTab}
        </Text>
        <BottomSheetFlatList
          data={modelStore.availableModels}
          renderItem={({item}: {item: Model}) => renderModelItem(item)}
          keyExtractor={(item: Model) => item.id}
          contentContainerStyle={{paddingBottom: chatInputHeight + 66}}
          ListEmptyComponent={
            <Text style={styles.title}>
              {l10n.components.chatEmptyPlaceholder.noModelsTitle}
            </Text>
          }
        />
      </BottomSheet>
    );
  },
);
