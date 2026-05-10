import {criticLLM} from "./aiService.js";

/**
 * CriticAgent.js
 * * Responsibilities:
 * 1. Receive AST comparison reports.
 * 2. Formulate "Criticism" by comparing Source (Java) and Candidate (TS).
 * 3. Decide if the code is 'Approved' based on accuracy and logic parity.
 */
class CriticAgent {
    constructor(llmClient = criticLLM, accuracyThreshold = 85) {
        this.llm = llmClient; // Your LLM provider instance
        console.log(`Initialized CriticAgent with model: ${criticLLM.model}`);
        this.threshold = accuracyThreshold;
    }

    /**
     * Entry point for the validation loop
     * @param {string} javaSource - Original Selenium code
     * @param {string} tsCandidate - Generated Playwright code
     * @param {object} astReport - Output from AstAnalyzer.compare()
     */
    async analyze(javaSource, tsCandidate, astReport) {
        // 1. Check for immediate pass (Deterministic check)
        if (astReport.accuracyScore >= 100) {
            return {
                isApproved: true,
                feedback: "Structural integrity verified. 100% logic parity.",
                score: astReport.accuracy
            };
        }

        // 2. Prepare context for the LLM "Reasoning"
        const prompt = this._buildCriticPrompt(javaSource, tsCandidate, astReport);
     //   console.log(`Constructed Critic Prompt: ${prompt}`);

        // 3. Call LLM to act as the Critic
        try {
            const reviewResponse = await this.llm.chat([
                { role: "system", content: this._getSystemInstructions() },
                { role: "user", content: prompt }
            ]);

            const analysis = this._parseReview(reviewResponse);
            console.log(`Parsed Critic Analysis: ${JSON.stringify(analysis)}`);
            // 4. Final Approval Logic
            // Approval requires BOTH the LLM's 'APPROVE' tag and a minimum accuracy score
            const isApproved = analysis.decision === "APPROVE";// && astReport.accuracyScore >= this.threshold;

            return {
                isApproved: isApproved,
                feedback: analysis.feedback,
                score: astReport.accuracyScore,
                hallucinations: analysis.hallucinations
            };

        } catch (error) {
            console.error("Critic Agent failed to reach a decision:", error);
            return { isApproved: false, feedback: "Error in Critic reasoning loop.", score: astReport.accuracyScore };
        }
    }

    _getSystemInstructions() {
        return `You are a Senior Quality Architect specializing in migrating Selenium Java to Playwright TypeScript.
Your goal is LOGIC PARITY. You must ensure every business intent from the Java source exists in the TypeScript output.
You will be provided with an AST Analysis report highlighting missing actions.
Your output must follow this format:
DECISION: [APPROVE/REJECT]
FEEDBACK: [Bullet points of what is missing or wrong]
HALLUCINATIONS: [Any logic added that wasn't in source]`;
    }

    _buildCriticPrompt(java, ts, report) {
        return `
### SOURCE JAVA:
${java}

### GENERATED TYPESCRIPT:
${ts}

### AST ANALYSIS REPORT:
- Accuracy: ${report.accuracyScore}
- Missing Actions (Intents): ${report.missingFromTs || "None"}
- Java Sequence: ${JSON.stringify(report.javaSequence)}
- TS Sequence: ${JSON.stringify(report.tsSequence)}

### CRITIQUE TASK:
Source Java is a selenium file for which the Playwright code was generated. Your task is to determine if the generated code can be APPROVED as a valid migration or if it should be REJECTED for missing critical logic.
Review the code and determine if the 'Missing Actions' are truly lost or just renamed. 
If logic is lost, explain exactly where it needs to be inserted.
If the LLM added unnecessary waits or actions not in Java, list them as hallucinations.
Check if any stub methods are present in the TS that weren't in Java, as this indicates incomplete generation.`;
    }

    _parseReview(text) {
        console.log(`critic response ++++++ ${JSON.stringify(text)}`)
        const decision = text.includes("DECISION: APPROVE") ? "APPROVE" : "REJECT";
        const feedbackMatch = text.match(/FEEDBACK:([\s\S]*?)(?=HALLUCINATIONS|$)/);
        const hallucinationMatch = text.match(/HALLUCINATIONS:([\s\S]*?)$/);

        return {
            decision: decision,
            feedback: feedbackMatch ? feedbackMatch[1].trim() : "No feedback provided.",
            hallucinations: hallucinationMatch ? hallucinationMatch[1].trim() : "None detected."
        };
    }
}

export {CriticAgent};
