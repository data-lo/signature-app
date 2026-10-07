import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import SignatureTypeField from './SignatureTypeField';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { SigningCredentialStatus } from '@/lib/enums/identity';
import type { CreateDocumentSignaturesFormValues } from '../_schemas';
import type { AuthUser } from '@/lib/store/types/auth-store.types';
import { buildBillingAccess } from '@/lib/api/billing.fixtures';
import type { DocumentSignatureType } from '../_schemas';

const ACCOUNT_ID = 'account-1';

/** Deja en el store la cuenta activa con su estado comercial, como lo hace `useBillingAccess`. */
function setBiometricPlan(graphSignatureBiometrics: boolean) {
  useAuthStore.setState({
    activeAccount: { id: ACCOUNT_ID } as never,
    billingByAccountId: {
      [ACCOUNT_ID]: buildBillingAccess({
        actions: { graphSignatureBiometrics },
      }),
    },
  });
}

/**
 * Abre el selector con el teclado: jsdom no dispara los PointerEvent con los que @base-ui/react
 * abre el Select con click (ver `form-select.spec.tsx`).
 */
async function openSelect(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole('combobox').focus();
  await user.keyboard('{Enter}');
}

const WARNING =
  'Para firmar documentos es necesario configurar tu identidad y firma.';

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'juan@empresa.com',
    identificationNumber: 'PELJ850101HDFRNN08',
    name: 'Juan',
    lastName: 'Pérez',
    signingCredentialStatus:
      SigningCredentialStatus.IdentityVerificationRequired,
    personalConfigured: false,
    ...overrides,
  };
}

function Harness({
  signatureType,
}: {
  signatureType?: DocumentSignatureType;
}) {
  const { control } = useForm<CreateDocumentSignaturesFormValues>({
    defaultValues: { signatureType } as never,
  });

  return <SignatureTypeField control={control} />;
}

describe('SignatureTypeField', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      activeAccount: null,
      billingByAccountId: {},
    });
  });

  it('con firma Simple y credencial sin configurar, avisa y ofrece ir a configurarla', () => {
    useAuthStore.setState({ user: buildUser() });

    render(<Harness signatureType="SIMPLE" />);

    expect(screen.getByText(WARNING)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Configura aquí.' }),
    ).toHaveAttribute('href', '/dashboard/personal-documents/identity');
  });

  /**
   * El aviso informa, no bloquea: el selector sigue habilitado y el documento se puede seguir
   * creando con firma Simple aunque el creador todavía no pueda firmarlo él mismo.
   */
  it('el aviso no deshabilita el selector ni oculta las opciones', () => {
    useAuthStore.setState({ user: buildUser() });

    render(<Harness signatureType="SIMPLE" />);

    const select = screen.getByRole('combobox');

    expect(select).not.toBeDisabled();
    expect(select).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('con la credencial en CONFIGURED no avisa nada', () => {
    useAuthStore.setState({
      user: buildUser({
        signingCredentialStatus: SigningCredentialStatus.Configured,
      }),
    });

    render(<Harness signatureType="SIMPLE" />);

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  /** Firmar con e.firma acredita la identidad con el certificado del SAT: no aplica el aviso. */
  it('con firma avanzada no avisa, aunque falte la credencial', () => {
    useAuthStore.setState({ user: buildUser() });

    render(<Harness signatureType="ADVANCED" />);

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('sin tipo de firma elegido no avisa nada', () => {
    useAuthStore.setState({ user: buildUser() });

    render(<Harness />);

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  /**
   * Mientras el perfil no llega, "no sé" se trata distinto de "sé que falta": mostrar el aviso
   * se lo pondría delante a usuarios que sí tienen su credencial lista.
   */
  it('mientras el perfil no esta hidratado no avisa nada', () => {
    render(<Harness signatureType="SIMPLE" />);

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  describe('firma biométrica', () => {
    it('se ofrece junto a las demás cuando el plan incluye graphSignatureBiometrics', async () => {
      const user = userEvent.setup();
      setBiometricPlan(true);

      render(<Harness />);
      await openSelect(user);

      expect(
        await screen.findByRole('option', { name: 'Firma Biométrica' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Firma Grafo' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', {
          name: 'Firma Electrónica Avanzada (e.firma)',
        }),
      ).toBeInTheDocument();
    });

    it('no se ofrece cuando el plan no la incluye, y las demás siguen', async () => {
      const user = userEvent.setup();
      setBiometricPlan(false);

      render(<Harness />);
      await openSelect(user);

      expect(
        await screen.findByRole('option', { name: 'Firma Grafo' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: 'Firma Biométrica' }),
      ).not.toBeInTheDocument();
    });

    /** Ante la duda no se ofrece: el backend la rechazaría si el plan no la tuviera. */
    it('no se ofrece mientras el estado comercial no ha llegado', async () => {
      const user = userEvent.setup();

      render(<Harness />);
      await openSelect(user);

      expect(
        await screen.findByRole('option', { name: 'Firma Grafo' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: 'Firma Biométrica' }),
      ).not.toBeInTheDocument();
    });

    it('elegida, describe el flujo y ofrece el código de seguridad', () => {
      setBiometricPlan(true);

      render(<Harness signatureType="BIOMETRIC" />);

      expect(
        screen.getByText(/prueba de vida y reconocimiento facial/),
      ).toBeInTheDocument();
      expect(screen.getByText('Código de seguridad')).toBeInTheDocument();
    });

    it('elegida, no muestra el aviso de la credencial de firma Grafo', () => {
      useAuthStore.setState({ user: buildUser() });
      setBiometricPlan(true);

      render(<Harness signatureType="BIOMETRIC" />);

      expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
    });
  });
});
