import { Box, Text, useApp, useInput } from 'ink';
import React, { startTransition, useEffect, useState } from 'react';

import { CookError } from '../core/cook-error.js';
import {
  applyRawRecipe,
  buildRawReview,
  getNextVariableName,
  inspectRawRecipe,
  saveRawRecipe
} from './raw-session.js';

type RawPhase = 'recipe' | 'variable' | 'destination' | 'review' | 'save' | 'done';
type SaveIntent = 'save' | 'save-and-apply';

export interface RawAppProps {
  initialRecipe?: string;
}

export function RawApp({ initialRecipe = '' }: RawAppProps): React.ReactElement {
  const { exit } = useApp();
  const [ phase, setPhase ] = useState<RawPhase>('recipe');
  const [ recipeSource, setRecipeSource ] = useState(initialRecipe);
  const [ bindings, setBindings ] = useState<Record<string, string>>({});
  const [ destination, setDestination ] = useState(process.cwd());
  const [ variableDraft, setVariableDraft ] = useState('');
  const [ saveNameDraft, setSaveNameDraft ] = useState('');
  const [ saveIntent, setSaveIntent ] = useState<SaveIntent>('save');
  const [ reviewText, setReviewText ] = useState('');
  const [ reviewError, setReviewError ] = useState<string | undefined>();
  const [ statusMessage, setStatusMessage ] = useState<string | undefined>();
  const [ isBusy, setIsBusy ] = useState(false);

  const inspection = inspectRawRecipe(recipeSource);
  const nextVariableName = getNextVariableName(inspection.variableNames, bindings);

  useEffect(() => {
    if (phase === 'variable' && !nextVariableName) {
      setPhase('destination');
    }
  }, [ phase, nextVariableName ]);

  useEffect(() => {
    if (phase !== 'review') {
      return;
    }

    let cancelled = false;

    setIsBusy(true);
    setReviewText('');
    setReviewError(undefined);

    void (async () => {
      try {
        const review = await buildRawReview(recipeSource, bindings, destination);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setReviewText(review.previewText);
          setReviewError(undefined);
          setIsBusy(false);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setReviewError(error instanceof Error ? error.message : 'Could not build the preview.');
          setIsBusy(false);
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ phase, recipeSource, bindings, destination ]);

  useInput((input, key) => {
    if (isBusy) {
      if (key.ctrl && input === 'c') {
        exit();
      }

      return;
    }

    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (phase === 'recipe') {
      handleRecipePhaseInput(input, key, {
        recipeSource,
        inspectionError: inspection.error,
        nextVariableName,
        setRecipeSource,
        setPhase,
        setStatusMessage
      });
      return;
    }

    if (phase === 'variable') {
      handleVariablePhaseInput(input, key, {
        currentVariableName: nextVariableName,
        variableDraft,
        bindings,
        setBindings,
        setVariableDraft,
        setPhase,
        setStatusMessage
      });
      return;
    }

    if (phase === 'destination') {
      handleSingleLineInput(input, key, destination, setDestination, () => {
        if (destination.trim() === '') {
          setStatusMessage('Choose a destination directory first.');
          return;
        }

        setStatusMessage(undefined);
        setPhase('review');
      }, () => {
        if (nextVariableName) {
          setVariableDraft(bindings[nextVariableName] ?? '');
          setPhase('variable');
          return;
        }

        setPhase('recipe');
      });
      return;
    }

    if (phase === 'review') {
      handleReviewPhaseInput(input, key, {
        reviewError,
        recipeSource,
        bindings,
        destination,
        setPhase,
        setSaveIntent,
        setSaveNameDraft,
        setStatusMessage,
        setIsBusy,
        setReviewError,
        setReviewText,
        exit
      });
      return;
    }

    if (phase === 'save') {
      handleSingleLineInput(input, key, saveNameDraft, setSaveNameDraft, async () => {
        if (saveNameDraft.trim() === '') {
          setStatusMessage('Choose a saved recipe name first.');
          return;
        }

        setIsBusy(true);

        try {
          await saveRawRecipe(saveNameDraft.trim(), recipeSource);

          if (saveIntent === 'save-and-apply') {
            const plan = await applyRawRecipe(recipeSource, bindings, destination);

            setStatusMessage(`Saved "${saveNameDraft.trim()}" and wrote ${plan.files.length} file(s).`);
            setPhase('done');
            setIsBusy(false);
            return;
          }

          setStatusMessage(`Saved recipe as "${saveNameDraft.trim()}".`);
          setPhase('review');
          setIsBusy(false);
        } catch (error) {
          setStatusMessage(error instanceof Error ? error.message : 'Could not save the recipe.');
          setIsBusy(false);
        }
      }, () => {
        setStatusMessage(undefined);
        setPhase('review');
      });
      return;
    }

    if (phase === 'done' && key.return) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>cook raw</Text>
      <Text dimColor>Ctrl+C exits at any time.</Text>
      {statusMessage ? <Text color="yellow">{statusMessage}</Text> : null}
      {phase === 'recipe' ? (
        <RecipeEditorView
          recipeSource={recipeSource}
          templateTree={inspection.templateTree}
          variableNames={inspection.variableNames}
          error={inspection.error}
        />
      ) : null}
      {phase === 'variable' ? (
        <PromptView
          title={`Variable: ${nextVariableName ?? 'done'}`}
          description='Type a value and press Enter. Ctrl+B goes back.'
          value={variableDraft}
        />
      ) : null}
      {phase === 'destination' ? (
        <PromptView
          title='Destination'
          description='Choose the parent directory to write into. Press Enter to continue or Ctrl+B to go back.'
          value={destination}
        />
      ) : null}
      {phase === 'review' ? (
        <ReviewView
          reviewText={reviewText}
          reviewError={reviewError}
          isBusy={isBusy}
        />
      ) : null}
      {phase === 'save' ? (
        <PromptView
          title='Saved recipe name'
          description='Choose a name for ~/.cook/recipes/<name>.rcp. Press Enter to save or Ctrl+B to go back.'
          value={saveNameDraft}
        />
      ) : null}
      {phase === 'done' ? (
        <DoneView statusMessage={statusMessage} />
      ) : null}
    </Box>
  );
}

interface RecipePhaseContext {
  recipeSource: string;
  inspectionError: string | undefined;
  nextVariableName: string | undefined;
  setRecipeSource: React.Dispatch<React.SetStateAction<string>>;
  setPhase: React.Dispatch<React.SetStateAction<RawPhase>>;
  setStatusMessage: React.Dispatch<React.SetStateAction<string | undefined>>;
}

function handleRecipePhaseInput(
  input: string,
  key: Parameters<typeof useInput>[0] extends (input: infer T, key: infer U) => void ? U : never,
  context: RecipePhaseContext
): void {
  if (key.return) {
    context.setRecipeSource((current) => `${current}\n`);
    return;
  }

  if (key.backspace || key.delete) {
    context.setRecipeSource((current) => current.slice(0, -1));
    return;
  }

  if (key.tab) {
    context.setRecipeSource((current) => `${current}  `);
    return;
  }

  if (key.ctrl && input === 'n') {
    if (context.recipeSource.trim() === '') {
      context.setStatusMessage('Add a recipe first.');
      return;
    }

    if (context.inspectionError) {
      context.setStatusMessage(context.inspectionError);
      return;
    }

    context.setStatusMessage(undefined);
    context.setPhase(context.nextVariableName ? 'variable' : 'destination');
    return;
  }

  if (input.length > 0 && !key.ctrl && !key.meta) {
    context.setRecipeSource((current) => `${current}${input}`);
  }
}

interface VariablePhaseContext {
  currentVariableName: string | undefined;
  variableDraft: string;
  bindings: Record<string, string>;
  setBindings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setVariableDraft: React.Dispatch<React.SetStateAction<string>>;
  setPhase: React.Dispatch<React.SetStateAction<RawPhase>>;
  setStatusMessage: React.Dispatch<React.SetStateAction<string | undefined>>;
}

function handleVariablePhaseInput(
  input: string,
  key: Parameters<typeof useInput>[0] extends (input: infer T, key: infer U) => void ? U : never,
  context: VariablePhaseContext
): void {
  if (!context.currentVariableName) {
    context.setPhase('destination');
    return;
  }

  handleSingleLineInput(input, key, context.variableDraft, context.setVariableDraft, () => {
    context.setBindings((current) => ({
      ...current,
      [context.currentVariableName!]: context.variableDraft
    }));
    context.setVariableDraft('');
    context.setStatusMessage(undefined);
    context.setPhase('variable');
  }, () => {
    context.setStatusMessage(undefined);
    context.setPhase('recipe');
  });
}

interface ReviewPhaseContext {
  reviewError: string | undefined;
  recipeSource: string;
  bindings: Record<string, string>;
  destination: string;
  setPhase: React.Dispatch<React.SetStateAction<RawPhase>>;
  setSaveIntent: React.Dispatch<React.SetStateAction<SaveIntent>>;
  setSaveNameDraft: React.Dispatch<React.SetStateAction<string>>;
  setStatusMessage: React.Dispatch<React.SetStateAction<string | undefined>>;
  setIsBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setReviewError: React.Dispatch<React.SetStateAction<string | undefined>>;
  setReviewText: React.Dispatch<React.SetStateAction<string>>;
  exit: () => void;
}

function handleReviewPhaseInput(
  input: string,
  key: Parameters<typeof useInput>[0] extends (input: infer T, key: infer U) => void ? U : never,
  context: ReviewPhaseContext
): void {
  if (key.ctrl && input === 'b') {
    context.setStatusMessage(undefined);
    context.setPhase('destination');
    return;
  }

  if (context.reviewError) {
    if (input === 'e') {
      context.setPhase('recipe');
    }

    return;
  }

  if (input === 'e') {
    context.setStatusMessage(undefined);
    context.setPhase('recipe');
    return;
  }

  if (input === 'd') {
    context.setStatusMessage(undefined);
    context.setPhase('destination');
    return;
  }

  if (input === 's') {
    context.setSaveIntent('save');
    context.setSaveNameDraft('');
    context.setStatusMessage(undefined);
    context.setPhase('save');
    return;
  }

  if (input === 'w') {
    context.setSaveIntent('save-and-apply');
    context.setSaveNameDraft('');
    context.setStatusMessage(undefined);
    context.setPhase('save');
    return;
  }

  if (input === 'a') {
    context.setIsBusy(true);

    void (async () => {
      try {
        const plan = await applyRawRecipe(context.recipeSource, context.bindings, context.destination);

        startTransition(() => {
          context.setStatusMessage(`Wrote ${plan.files.length} file(s) into ${plan.outDirectory}.`);
          context.setReviewError(undefined);
          context.setReviewText('');
          context.setIsBusy(false);
          context.setPhase('done');
        });
      } catch (error) {
        startTransition(() => {
          context.setStatusMessage(error instanceof Error ? error.message : 'Could not apply the recipe.');
          context.setIsBusy(false);
        });
      }
    })();

    return;
  }

  if (input === 'q') {
    context.exit();
  }
}

function handleSingleLineInput(
  input: string,
  key: Parameters<typeof useInput>[0] extends (input: infer T, key: infer U) => void ? U : never,
  value: string,
  setValue: React.Dispatch<React.SetStateAction<string>>,
  onSubmit: () => void | Promise<void>,
  onBack: () => void
): void {
  if (key.return) {
    void onSubmit();
    return;
  }

  if (key.ctrl && input === 'b') {
    onBack();
    return;
  }

  if (key.backspace || key.delete) {
    setValue(value.slice(0, -1));
    return;
  }

  if (key.tab) {
    setValue(`${value}  `);
    return;
  }

  if (input.length > 0 && !key.ctrl && !key.meta) {
    setValue(`${value}${input}`);
  }
}

interface RecipeEditorViewProps {
  recipeSource: string;
  templateTree: string | undefined;
  variableNames: string[];
  error: string | undefined;
}

function RecipeEditorView({
  recipeSource,
  templateTree,
  variableNames,
  error
}: RecipeEditorViewProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Step 1: recipe</Text>
      <Text dimColor>Type or paste a recipe. Enter adds a line, Tab inserts two spaces, Ctrl+N continues.</Text>
      <Box borderStyle="round" paddingX={1} flexDirection="column" marginTop={1}>
        <Text>{recipeSource === '' ? '(empty)' : recipeSource}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Preview</Text>
        {error ? <Text color="red">{error}</Text> : <Text>{templateTree ?? '(preview unavailable)'}</Text>}
        <Text dimColor>
          Variables: {variableNames.length > 0 ? variableNames.join(', ') : 'none'}
        </Text>
      </Box>
    </Box>
  );
}

interface PromptViewProps {
  title: string;
  description: string;
  value: string;
}

function PromptView({ title, description, value }: PromptViewProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>{title}</Text>
      <Text dimColor>{description}</Text>
      <Box borderStyle="round" paddingX={1} marginTop={1}>
        <Text>{value === '' ? '(empty)' : value}</Text>
      </Box>
    </Box>
  );
}

interface ReviewViewProps {
  reviewText: string;
  reviewError: string | undefined;
  isBusy: boolean;
}

function ReviewView({ reviewText, reviewError, isBusy }: ReviewViewProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Step 4: review</Text>
      <Text dimColor>Press `a` to apply, `s` to save, `w` to save and apply, `e` to edit, `d` to change destination, or `q` to quit.</Text>
      <Box borderStyle="round" paddingX={1} flexDirection="column" marginTop={1}>
        {isBusy ? <Text>Building preview...</Text> : null}
        {reviewError ? <Text color="red">{reviewError}</Text> : null}
        {!isBusy && !reviewError ? <Text>{reviewText}</Text> : null}
      </Box>
    </Box>
  );
}

function DoneView({ statusMessage }: { statusMessage: string | undefined }): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Done</Text>
      <Text>{statusMessage ?? 'Completed.'}</Text>
      <Text dimColor>Press Enter to exit.</Text>
    </Box>
  );
}
