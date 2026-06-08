import type { SVGProps } from "react";

export function BaseWalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0.8 2.7c0-.7 0-1.05.136-1.318.13-.255.337-.461.592-.591C1.795.654 2.145.654 2.846.654h18.308c.701 0 1.051 0 1.318.137.255.13.462.336.592.591.136.268.136.618.136 1.319v18.598c0 .701 0 1.051-.136 1.319-.13.255-.337.461-.592.591-.267.137-.617.137-1.318.137H2.846c-.701 0-1.051 0-1.318-.137a1.3 1.3 0 0 1-.592-.591C.8 22.35.8 22 .8 21.299z"
        fill="currentColor"
      />
    </svg>
  );
}

const MetaMaskIconMarkup =
  '<path d="M132.682 132.192l-30.583-9.106-23.063 13.787-16.092-.007-23.077-13.78-30.569 9.106L0 100.801l9.299-34.839L0 36.507 9.299 0l47.766 28.538h27.85L132.682 0l9.299 36.507-9.299 29.455 9.299 34.839-9.299 31.391z" fill="currentColor" opacity=".2"/><path d="M9.305 0l47.767 28.558-1.899 19.599L9.305 0zm30.57 100.814 21.017 16.01-21.017 6.261v-22.271zm19.337-26.469-4.039-26.174L29.317 65.97l-.014-.007v.013l.08 18.321 10.485-9.951h19.344zm73.47-74.345L84.915 28.558l1.893 19.599L132.682 0zm-30.569 100.814-21.018 16.01 21.018 6.261v-22.271zm10.565-34.839h.007-.007v-.013l-.006.007-25.857-17.798-4.039 26.174h19.336l10.492 9.95.074-18.32z" fill="currentColor" opacity=".56"/><path d="M39.868 123.085 9.299 132.191 0 100.814h39.868v22.271zm19.337-48.747 5.839 37.84-8.093-21.04-27.581-6.843 10.491-9.956h19.344zm42.907 48.747 30.57 9.106 9.299-31.378h-39.869v22.272zm-19.336-48.747-5.839 37.84 8.092-21.04 27.583-6.843-10.498-9.956H82.776z" fill="currentColor" opacity=".42"/><path d="M0 100.801l9.299-34.839h19.997l.073 18.327 27.584 6.843 8.092 21.039-4.16 4.633-21.017-16.01H0zm141.981 0-9.299-34.839h-19.998l-.073 18.327-27.582 6.843-8.093 21.039 4.159 4.633 21.018-16.01h39.868zM84.915 28.538h-27.85l-1.891 19.599 9.872 64.013h11.891l9.878-64.013z" fill="currentColor" opacity=".3"/><path d="M9.299 0 0 36.507l9.299 29.455h19.997l25.87-17.804L9.299 0zm44.127 81.938h-9.059l-4.932 4.835 17.524 4.344-3.533-9.186v.007zM132.682 0l9.299 36.507-9.299 29.455h-19.998L86.815 48.158 132.682 0zM88.568 81.938h9.072l4.932 4.841-17.544 4.353 3.54-9.201v.007zm-9.539 42.447 2.067-7.567-4.16-4.633h-11.9l-4.159 4.633 2.066 7.567" fill="currentColor" opacity=".9"/><path d="M79.029 124.384v12.495H62.945v-12.495h16.084z" fill="currentColor" opacity=".5"/><path d="M39.875 123.072l23.083 13.8v-12.495l-2.067-7.566-21.016 6.261zm62.238 0-23.084 13.8v-12.495l2.067-7.566 21.017 6.261z" fill="currentColor" opacity=".72"/>';

export function MetaMaskIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 142 136.878"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: MetaMaskIconMarkup }}
      {...props}
    />
  );
}

const RabbyIconMarkup =
  '<path d="M148.047 88.617c5.401-12.11-21.298-45.944-46.804-60.04-16.077-10.919-32.83-9.419-36.223-4.625-7.446 10.523 24.657 19.439 46.126 29.843-4.615 2.012-8.964 5.623-11.522 10.24-8.004-8.771-25.571-16.324-46.185-10.24-13.891 4.1-25.435 13.766-29.897 28.366a8.69 8.69 0 0 0-3.548-.753c-4.829 0-8.744 3.93-8.744 8.777s3.915 8.778 8.744 8.778c.895 0 3.694-.603 3.694-.603l44.725.325c-17.886 28.483-32.022 32.646-32.022 37.581s13.525 3.597 18.604 1.758c24.311-8.805 50.422-36.247 54.902-44.146 18.816 2.356 34.629 2.635 38.15-5.261z" fill="currentColor"/><path d="M64.484 29.359c1.511-3.021 11.72-3.358 25.584 3.197 10.176 4.811 21.013 15.552 21.641 18.215.273 1.158.433 2.634-.562 3.027l-.004-.002.003-.001c-17.702-8.579-42.632-16.146-46.662-24.436z" fill="currentColor" opacity=".45"/><path d="M58.669 71.877c14.846 0 21.235 4.823 26.325 13.882 3.626 6.455 2.821 16.666-1.019 23.563 3.6.895 6.767 1.883 9.57 2.959-4.547 4.25-9.751 8.663-15.286 12.71-7.536-1.93-14.384-3.763-24.767-6.434 4.438-4.861 9.509-11.252 14.922-19.872l-40.145-.292a48.64 48.64 0 0 1-.14-5.333c.391-18.421 22.375-21.183 30.54-21.183z" fill="currentColor" opacity=".3"/><path d="M23.006 96.5c1.64 13.994 9.563 19.478 25.753 21.101 16.19 1.623 25.477.535 37.841 1.664 10.327.943 19.547 6.225 22.967 4.399 3.079-1.642 1.356-7.577-2.763-11.385-5.339-4.936-12.729-8.368-25.731-9.585 2.591-7.122 1.865-17.108-2.16-22.541-5.819-7.855-16.56-11.406-30.154-9.855C34.557 71.919 20.948 78.938 23.006 96.5z" fill="currentColor" opacity=".62"/>';

export function RabbyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 161 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: RabbyIconMarkup }}
      {...props}
    />
  );
}

const RainbowIconMarkup =
  '<path d="M0 18h6c30.928 0 56 25.072 56 56v6h12a6 6 0 0 0 6-6C80 33.131 46.869 0 6 0a6 6 0 0 0-6 6v12z" fill="currentColor"/><path d="M64 74h16a6 6 0 0 1-6 6H64v-6z" fill="currentColor" opacity=".82"/><path d="M6 0v16H0V6a6 6 0 0 1 6-6z" fill="currentColor" opacity=".82"/><path d="M0 16h6c32.033 0 58 25.968 58 58v6H46v-6c0-22.091-17.909-40-40-40H0V16z" fill="currentColor" opacity=".64"/><path d="M48 74h16v6H48v-6z" fill="currentColor" opacity=".52"/><path d="M0 32V16h6v16H0z" fill="currentColor" opacity=".52"/><path d="M0 42a6 6 0 0 0 6 6c14.359 0 26 11.641 26 26a6 6 0 0 0 6 6h10v-6C48 50.804 29.196 32 6 32H0v10z" fill="currentColor" opacity=".38"/><path d="M32 74h16v6H38a6 6 0 0 1-6-6z" fill="currentColor" opacity=".34"/><path d="M6 48a6 6 0 0 1-6-6V32h6v16z" fill="currentColor" opacity=".34"/>';

export function RainbowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: RainbowIconMarkup }}
      {...props}
    />
  );
}

export function CoinbaseWalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.16" />
      <path d="M7 7h10v10H7z" fill="currentColor" opacity="0.92" />
    </svg>
  );
}

export function WalletConnectIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M6.15 9.65a8.27 8.27 0 0 1 11.7 0l.39.39a.5.5 0 0 1 0 .71l-1.32 1.32a.47.47 0 0 1-.67 0l-.54-.54a5.25 5.25 0 0 0-7.42 0l-.58.58a.47.47 0 0 1-.67 0l-1.32-1.32a.5.5 0 0 1 0-.71l.43-.43z"
        fill="currentColor"
      />
      <path
        d="m9 14.18 1.78 1.78a1.72 1.72 0 0 0 2.44 0L15 14.18a.45.45 0 0 0 0-.64l-.85-.85a.45.45 0 0 0-.64 0l-.97.97a.77.77 0 0 1-1.08 0l-.97-.97a.45.45 0 0 0-.64 0l-.85.85a.45.45 0 0 0 0 .64z"
        fill="currentColor"
        opacity="0.58"
      />
    </svg>
  );
}
