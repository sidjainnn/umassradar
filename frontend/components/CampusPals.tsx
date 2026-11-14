export function CampusPals() {
  return (
    <div className="campus-pals" aria-hidden="true">
      <div className="pal pal-raccoon">
        <svg viewBox="0 0 150 120" role="presentation">
          <path
            className="pal-tail"
            d="M115 87c31-5 33-32 17-40-8-4-16 0-17 8 12-5 19 8 10 16-5 5-12 5-20 4"
            fill="#AFA7E8"
            stroke="#29255B"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M38 48 28 25l28 10M102 48l10-23-28 10"
            fill="#AFA7E8"
            stroke="#29255B"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M34 58c0-22 16-36 36-36s36 14 36 36v21c0 21-17 34-36 34S34 100 34 79Z"
            fill="#C9C2F3"
            stroke="#29255B"
            strokeWidth="4"
          />
          <path
            d="M39 57c11-12 50-12 62 0-4 20-15 27-31 27S43 77 39 57Z"
            fill="#6E64A8"
          />
          <ellipse cx="52" cy="61" rx="7" ry="9" fill="#fff" />
          <ellipse cx="88" cy="61" rx="7" ry="9" fill="#fff" />
          <circle cx="54" cy="63" r="3.5" fill="#29255B" />
          <circle cx="86" cy="63" r="3.5" fill="#29255B" />
          <path d="M64 75h12l-6 7Z" fill="#29255B" />
          <path
            d="M62 88c5 5 11 5 16 0"
            fill="none"
            stroke="#29255B"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="45" cy="79" r="5" fill="#F4A6B9" opacity=".7" />
          <circle cx="95" cy="79" r="5" fill="#F4A6B9" opacity=".7" />
          <path
            d="M48 105v10M92 105v10"
            stroke="#29255B"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M54 39c8-4 24-4 32 0"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".75"
          />
        </svg>
        <span>Radar raccoon</span>
      </div>
      <div className="pal pal-duck">
        <svg viewBox="0 0 130 110" role="presentation">
          <path
            d="M34 67c0-23 15-39 36-39 24 0 39 17 39 39 0 21-17 35-40 35-22 0-35-14-35-35Z"
            fill="#FFD96A"
            stroke="#51451C"
            strokeWidth="4"
          />
          <path
            d="M27 65 8 73l21 7"
            fill="#FF9D7A"
            stroke="#51451C"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="80" cy="52" r="5" fill="#51451C" />
          <circle cx="82" cy="50" r="1.5" fill="#fff" />
          <path
            d="M50 76c11 8 25 7 35-2"
            fill="none"
            stroke="#E4AD2F"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            className="pal-wing"
            d="M62 69c-17-9-25 1-17 12 6 8 18 4 24-2"
            fill="#FFE99F"
            stroke="#51451C"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M61 101v7M88 99v9"
            stroke="#E28B52"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <span>Deadline duck</span>
      </div>
      <div className="pal pal-squirrel">
        <svg viewBox="0 0 150 120" role="presentation">
          <path
            className="pal-tail"
            d="M100 88c42 4 47-50 19-59-22-7-38 13-25 28 8 9 22 6 24-4 11 17-5 29-24 22"
            fill="#F5A677"
            stroke="#5F3526"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M34 64c0-25 15-41 35-41s34 17 34 41v19c0 19-14 31-34 31S34 102 34 83Z"
            fill="#E98759"
            stroke="#5F3526"
            strokeWidth="4"
          />
          <path
            d="m43 38-8-21 22 13M91 38l10-21-25 13"
            fill="#E98759"
            stroke="#5F3526"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <ellipse cx="55" cy="58" rx="5" ry="7" fill="#2F241F" />
          <ellipse cx="84" cy="58" rx="5" ry="7" fill="#2F241F" />
          <circle cx="57" cy="56" r="1.5" fill="#fff" />
          <circle cx="86" cy="56" r="1.5" fill="#fff" />
          <path d="M63 70h12l-6 7Z" fill="#5F3526" />
          <path
            d="M61 84c5 4 11 4 16 0"
            fill="none"
            stroke="#5F3526"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse
            cx="69"
            cy="96"
            rx="13"
            ry="9"
            fill="#A86C3B"
            transform="rotate(-8 69 96)"
          />
        </svg>
        <span>Study squirrel</span>
      </div>
    </div>
  );
}
