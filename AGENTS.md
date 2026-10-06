<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the POS as an IndexedDB-backed PWA; seed additions belong in versioned IndexedDB upgrades so existing offline installs retain their menu edits and receive only new dishes.
- Keep a print-only receipt copy outside the dialog portal so browser printing can isolate the receipt reliably.
- Use the Kings Food mark for Windows executable packaging; the multi-size `public/kings-food.ico` is the source icon if a native wrapper is added.
- Centralize payment QR eligibility in `src/lib/payment.ts` so checkout and receipts cannot display a QR for cash.
- Store offline tender and card-terminal confirmation on the order; the POS records externally completed payments and does not process bank cards itself.
