interface Props {
  className?: string
}

export default function PoweredByStrava({ className = '' }: Props) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/powered-by-strava.svg" alt="Powered by Strava" className={`dark:hidden ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/powered-by-strava-dark.svg" alt="Powered by Strava" className={`hidden dark:block ${className}`} />
    </>
  )
}
