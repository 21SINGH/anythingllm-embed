export default function Sponsor({ settings }) {
  if (!!settings.noSponsor) return null;

  return (
    <div className="allm-flex allm-w-full allm-items-center allm-justify-center">
      <a
        style={{ color: settings.cardTextSubColour, textDecoration: "none" }}
        href={settings.sponsorLink ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="allm-text-[14px] allm-font-sans hover:allm-opacity-80 "
      >
        {settings.sponsorText}
      </a>
    </div>
  );
}
