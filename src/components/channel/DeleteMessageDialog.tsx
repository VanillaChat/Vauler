import { Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { t } from '../../i18n';

export type DeleteCandidate = { id: string; preview: string };

type Props = {
  candidate: () => DeleteCandidate | null;
  closing: () => boolean;
  submitting: () => boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteMessageDialog(props: Props) {
  return (
    <Show when={props.candidate()}>
      {(c) => (
        <Portal>
          <div
            class={`fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm ${
              props.closing() ? 'animate-fade-out' : 'animate-fade-in'
            }`}
            onClick={() => !props.submitting() && props.onClose()}
          />
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              class={`pointer-events-auto w-full max-w-md rounded-3xl bg-white dark:bg-[#211e1b] shadow-2xl shadow-black/15 overflow-hidden ${
                props.closing() ? 'animate-popover-out' : 'animate-popover-in'
              }`}
            >
              <div class="px-6 pt-6 pb-2">
                <h2 class="font-display text-2xl">{t('delete-title')}</h2>
                <p class="text-sm text-stone-500 italic font-display mt-1">
                  {t('delete-sub')}
                </p>
              </div>
              <div class="mx-6 my-4 rounded-xl bg-[#fdfaf3] dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3 text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {c().preview}
              </div>
              <div class="px-6 pb-6 pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={props.onClose}
                  disabled={props.submitting()}
                  class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-stone-100 transition-colors disabled:opacity-60"
                >
                  {t('delete-cancel')}
                </button>
                <button
                  type="button"
                  onClick={props.onConfirm}
                  disabled={props.submitting()}
                  class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {props.submitting() ? t('delete-confirming') : t('delete-confirm')}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
}
