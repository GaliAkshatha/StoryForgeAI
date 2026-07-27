import { HTMLAttributes } from "react";

export function ParchmentCard({
    className = "",
    children,
    ...rest
}: HTMLAttributes<HTMLDivElement>) {

    return (
        <div
            className={`parchment-panel rounded-2xl p-6 shadow-page ${className}`}
            {...rest}
        >
            {children}
        </div>
    );

}
