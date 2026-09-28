import { css } from "lit";

export const formStyles = css`
  :host { display: block; }
  h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
  .lede { margin: 0 0 1rem; color: #374151; }
  label { font-weight: 600; }
  select, textarea { font: inherit; padding: 0.4rem 0.5rem; display: block; margin: 0.25rem 0 0.75rem;
                     border: 1px solid #6b7280; border-radius: 4px; max-width: 22rem; width: 100%; box-sizing: border-box; }
  button { font: inherit; padding: 0.4rem 0.9rem; margin-right: 0.5rem; }
  output, .status { display: block; margin-top: 1rem; padding: 0.5rem 0.75rem; background: #ecfdf5; border-radius: 4px; }
  .warn { background: #fef3c7; }
`;
