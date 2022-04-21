import { DebugJson, DebugTemplate, DebugField, DebugProcedure } from "./types";
import { TranslationOutput } from "web2cit/dist/domain/domain";

export function makeDebugJson(
  targetOutput: TranslationOutput,
  patternsRevid: number | undefined,
  templatesRevid: number | undefined
): DebugJson {
  const debugJson: DebugJson = {
    config: {
      patterns: patternsRevid
        ? `revid ${patternsRevid}`
        : "not found or corrupt",
      templates: templatesRevid
        ? `revid ${templatesRevid}`
        : "not found or corrupt",
    },
    pattern: targetOutput.translation.pattern ?? "",
    templates: [],
  };
  for (const templateOutput of targetOutput.translation.outputs) {
    const debugTemplate: DebugTemplate = {
      path: templateOutput.template.path ?? "fallback",
      applicable: templateOutput.template.applicable ?? "undefined",
      fields: [],
    };
    for (const field of templateOutput.template.fields ?? []) {
      const debugField: DebugField = {
        name: field.name,
        isArray: "see early adopter guidelines",
        pattern: "see early adopter guidelines",
        required: field.required,
        procedures: [],
        output: field.output,
        valid: field.valid,
        applicable: field.applicable,
      };
      for (const procedure of field.procedures) {
        const debugProcedure: DebugProcedure = {
          selection: {
            steps: [],
            output: [],
          },
          transformation: {
            steps: [],
            output: procedure.output,
          },
        };
        for (const selection of procedure.selections) {
          debugProcedure.selection.steps.push({
            type: selection.type,
            config: selection.config,
            output: selection.output,
          });
          debugProcedure.selection.output.push(...selection.output);
        }
        for (const transformation of procedure.transformations) {
          debugProcedure.transformation.steps.push({
            type: transformation.type,
            config: transformation.config,
            itemwise: transformation.itemwise,
            output: transformation.output,
          });
        }
        debugField.procedures.push(debugProcedure);
      }
      debugTemplate.fields.push(debugField);
    }
    debugJson.templates.push(debugTemplate);
  }
  return debugJson;
}
