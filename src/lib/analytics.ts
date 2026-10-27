// Google Analytics 4 measurement ID. Public by design (it appears in every page that loads gtag).
// Override with PUBLIC_GA_MEASUREMENT_ID, or set that variable to "off" to disable GA and the cookie banner.
const configured = import.meta.env.PUBLIC_GA_MEASUREMENT_ID as string | undefined;

export const GA_MEASUREMENT_ID: string | null =
  configured === 'off' ? null : configured || 'G-64Z1WC2M9S';
