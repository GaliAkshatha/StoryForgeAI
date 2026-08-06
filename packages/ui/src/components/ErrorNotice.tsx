import { motion } from "framer-motion";

interface ErrorNoticeProps {

    message: string;

    onRetry?: () => void;

}

// "Beautiful error cards... no raw backend errors" -- the backend
// already sanitizes error text before it reaches the frontend (a
// prior pass), so `message` here is always safe, friendly copy
// already. This component's job is purely presentational: stop
// showing errors as bare red text and give them the same visual
// care as everything else.
export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose/10 border border-rose/30"
        >
            <span className="text-rose text-lg leading-none mt-0.5" aria-hidden="true">
                ⚠
            </span>

            <div className="flex-1">

                <p className="text-parchment text-sm font-body">{message}</p>

                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="text-rose text-xs font-body underline decoration-dotted mt-1 hover:text-rose/80"
                    >
                        Try again
                    </button>
                )}

            </div>

        </motion.div>
    );

}
