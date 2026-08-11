import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  createDocumentWithSingleSigner,
  registerUser,
  type E2EUser,
} from './helpers/api';
import { collaboratorStatus, documentStatus, latestSigningCode } from './helpers/db';
import { dismissDialogIfPresent, login, openDocument } from './helpers/ui';

/**
 * Bug reportado: "El firmante ve el documento, pero no aparece el botón para iniciar la firma"
 * al crear un documento con un único firmante. Estas pruebas cubren los dos estados en los que
 * puede llegar ese firmante invitado.
 */
test.describe('Firmante único invitado', () => {
  let creator: E2EUser;

  test.beforeAll(async () => {
    creator = await registerUser('CREADOR');
    await completeOnboarding(creator);
  });

  test('sin firma configurada: la pantalla ofrece cómo desbloquearse, no queda sin acciones', async ({
    page,
  }) => {
    const signer = await registerUser('INVITADO');
    const documentId = await createDocumentWithSingleSigner({
      creator,
      signerEmail: signer.email,
    });

    await login(page, signer);

    // El documento sí llega a su bandeja "Por firmar".
    await page.goto('/dashboard/documents/to-sign');
    await expect(page.getByText('contrato-e2e.pdf').first()).toBeVisible();

    await openDocument(page, documentId);
    expect(await dismissDialogIfPresent(page)).toBe(true);

    // Regresión: al cerrar el diálogo la pantalla quedaba con "Solicitar código de verificación"
    // y "Rechazar documento" inertes y ninguna forma de avanzar.
    await expect(
      page.getByText(/tu firma digital simple, esta debe estar configurada/i),
    ).toBeVisible();

    // Las acciones de firma siguen bloqueadas (el backend exige rúbrica/INE en archivo)...
    await expect(
      page.getByRole('button', { name: /solicitar código de verificación/i }),
    ).toBeDisabled();
    await expect(page.getByRole('button', { name: /rechazar documento/i })).toBeDisabled();

    // ...pero la pantalla ya no es un callejón sin salida: hay una acción habilitada que lleva
    // a configurar la firma. (El Button del design system conserva role="button" aunque
    // renderice un <a>, igual que el del diálogo.)
    const configure = page.getByRole('button', { name: /configurar mi firma/i });
    await expect(configure).toBeEnabled();

    await configure.click();
    await expect(page).toHaveURL(/\/dashboard\/personal-documents\/identity$/);
  });

  test('con firma configurada: puede verificar y firmar el documento de principio a fin', async ({
    page,
  }) => {
    const signer = await registerUser('FIRMANTE');
    await completeOnboarding(signer);
    const documentId = await createDocumentWithSingleSigner({
      creator,
      signerEmail: signer.email,
    });

    await login(page, signer);
    await openDocument(page, documentId);

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /solicitar código de verificación/i }).click();

    const code = await expect
      .poll(() => latestSigningCode(documentId), { timeout: 15_000 })
      .not.toBe('')
      .then(() => latestSigningCode(documentId));

    await page.getByPlaceholder(/código de verificación/i).fill(code);
    await page.getByRole('button', { name: /^verificar código$/i }).click();

    const signButton = page.getByRole('button', { name: /continuar a firmar/i });
    await expect(signButton).toBeVisible();
    await signButton.click();

    await expect(page).toHaveURL(/\/dashboard\/documents\/to-sign$/, { timeout: 30_000 });
    await expect.poll(() => collaboratorStatus(documentId)).toBe('signed');
    expect(documentStatus(documentId)).toBe('signed');
  });
});
