import React from "react";

const TrashIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke={color}
    width={size}
    height={size}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6h18M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2m-7 0h6m-6 0v12a1 1 0 001 1h4a1 1 0 001-1V6m-6 0h6"
    />
  </svg>
);

export default TrashIcon;
