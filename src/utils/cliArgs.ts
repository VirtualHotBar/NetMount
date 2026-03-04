function parseExtraCliArgs(input?: string): string[] {
    if (!input || !input.trim()) return []

    const args: string[] = []
    let current = ''
    let quote: '"' | "'" | null = null

    for (let i = 0; i < input.length; i++) {
        const ch = input[i]!
        const next = input[i + 1]

        if (ch === '\\') {
            if (quote === '"') {
                // In double quotes, allow escaping quote/backslash.
                if (next === '"' || next === '\\') {
                    current += next
                    i++
                    continue
                }
                current += ch
                continue
            }

            if (!quote) {
                // Outside quotes, only treat as escape for whitespace/quote/backslash.
                if (next && (/\s/.test(next) || next === '"' || next === "'" || next === '\\')) {
                    current += next
                    i++
                    continue
                }
                // Keep normal Windows paths like C:\temp\logs literally.
                current += ch
                continue
            }
        }

        if (quote) {
            if (ch === quote) {
                quote = null
            } else {
                current += ch
            }
            continue
        }

        if (ch === '"' || ch === "'") {
            quote = ch
            continue
        }

        if (/\s/.test(ch)) {
            if (current) {
                args.push(current)
                current = ''
            }
            continue
        }

        current += ch
    }

    if (current) {
        args.push(current)
    }

    return args
}

export { parseExtraCliArgs }
