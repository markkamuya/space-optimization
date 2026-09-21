export function workshopDestructivePrompt(action, { placementIndex = 0, placementCount = 0 } = {}) {
  if (action === 'remove') return {
    title: `Remove triangle ${placementIndex + 1}?`,
    copy: `This removes triangle ${placementIndex + 1} from the local ${placementCount}-triangle candidate. The published packing is unchanged, and Undo can restore the triangle during this session.`,
    confirmLabel: `Remove triangle ${placementIndex + 1}`
  };
  if (action === 'reset') return {
    title: 'Reset this candidate to the verified baseline?',
    copy: 'Every local coordinate, inventory, and metadata edit will be replaced by the published baseline. A checksummed browser recovery copy must be saved before the reset can continue.',
    confirmLabel: 'Save recovery copy and reset'
  };
  if (action === 'recover') return {
    title: 'Replace the current local draft with saved work?',
    copy: 'The checksummed recovery copy will replace every current local coordinate, inventory, and metadata edit. Nothing is uploaded or published. Cancel and export the current draft first if you need both versions.',
    confirmLabel: 'Recover saved work'
  };
  return null;
}

export function requiresWorkshopResetConfirmation(dirty) {
  return dirty === true;
}
