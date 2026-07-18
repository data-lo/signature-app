import { selectParticipantsSchema } from './_schemas';

const SIGNER_ID = '11111111-1111-4111-8111-111111111111';
const SPECTATOR_ID = '22222222-2222-4222-8222-222222222222';

describe('selectParticipantsSchema', () => {
  it('acepta al menos un firmante y espectadores distintos', () => {
    const result = selectParticipantsSchema.safeParse({
      signerIds: [SIGNER_ID],
      watcherIds: [SPECTATOR_ID],
    });

    expect(result.success).toBe(true);
  });

  it('rechaza si no hay ningún firmante', () => {
    const result = selectParticipantsSchema.safeParse({
      signerIds: [],
      watcherIds: [],
    });

    expect(result.success).toBe(false);
  });

  it('rechaza si el mismo usuario es firmante y espectador a la vez', () => {
    const result = selectParticipantsSchema.safeParse({
      signerIds: [SIGNER_ID],
      watcherIds: [SIGNER_ID],
    });

    expect(result.success).toBe(false);
  });
});
