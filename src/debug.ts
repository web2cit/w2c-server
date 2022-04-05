import { Domain } from "web2cit";

export function makeDebugHtml(
  translation: Awaited<ReturnType<Domain["translate"]>>["translation"],
  patternsRevid: number | undefined,
  templatesRevid: number | undefined
): string {
  // todo: w2c-core's TranslationOutput pattern may be undefined if catch-all
  const pattern = translation.pattern;
  // todo: w2c-core's TranslationOutput may include pattern label
  const templates = translation.outputs
    .map((output) => makeTemplateHtml(output.template))
    .join("");

  const html = `
    <h2>Debugging information</h2>
    <ul>
      <li>patterns.json: ${
        patternsRevid ? `revid ${patternsRevid}` : "not found or corrupt"
      }
        <ul>
          <li>URL path pattern group: ${pattern}</li>
        </ul>
      </li>
      <li>templates.json: ${
        templatesRevid ? `revid ${templatesRevid}` : "not found or corrupt"
      }
        <ol>
          ${templates}
        </ol>
      </li>
    </ul>
  `;
  return html;
}

function makeTemplateHtml(
  template: Parameters<typeof makeDebugHtml>[0]["outputs"][number]["template"]
): string {
  const path = template.path;
  // todo: w2c-core's TranslationOutput may include template label
  // const label = output.template.label;
  const applicable = template.applicable;
  if (template.fields === undefined) {
    throw new Error(
      "Unexpected undefined fields property in debug translation output"
    );
  }
  const fields = template.fields.map((field) => makeFieldHtml(field)).join("");

  return `
    <li>Template: ${path}
      <ul>
        <li>applicable: ${applicable}</li>
        <li>fields:
          <ul>
            ${fields}
          </ul>
        </li>
      </ul>
    </li>
  `;
}

function makeFieldHtml(
  field: NonNullable<Parameters<typeof makeTemplateHtml>[0]["fields"]>[number]
): string {
  const fieldname = field.name;
  const required = field.required;
  // todo: w2c-core's FieldInfo may include field pattern
  // do we need isArray too?
  // const pattern = field.pattern;

  const valid = field.valid;
  const applicable = field.applicable;

  const output = field.output.map((value) => `<li>${value}</li>`).join("");

  const procedures = field.procedures
    .map((procedure, index) => makeProcedureHtml(procedure, index))
    .join("");

  return `
    <li>${fieldname} field
      <ul>
        <li>required: ${required}</li>
        <li>procedures:
          <ol>
            ${procedures}
          </ol>
        </li>
        <li>output:
          <ol>
            ${output}
          </ol>
        </li>
        <li>isArray: see <a href="https://meta.wikimedia.org/wiki/Web2Cit/Early_adopters#Translation_field_types">early adopter guidelines</a></li>
        <li>pattern: see <a href="https://meta.wikimedia.org/wiki/Web2Cit/Early_adopters#Translation_field_types">early adopter guidelines</a></li>
        <li>valid: ${valid}</li>
        <li>applicable: ${applicable}</li>
      </ul>
    </li>
  `;
}

function makeProcedureHtml(
  procedure: Parameters<typeof makeFieldHtml>[0]["procedures"][number],
  index: number
): string {
  const procedureOutput = procedure.output.reduce((html: string, value) => {
    html += `<li>${value}</li>`;
    return html;
  }, "");

  const selections = procedure.selections
    .map((selection) => makeSelectionHtml(selection))
    .join("");
  // todo: w2c-core's FieldInfo may have an overall selection output
  const selectionOutput = procedure.selections.reduce(
    (html: string, selection) => {
      html += selection.output.map((value) => `<li>${value}</li>`).join();
      return html;
    },
    ""
  );

  const transformations = procedure.transformations
    .map((transformation) => makeTransformationHtml(transformation))
    .join("");
  // todo: w2c-core's FieldInfo may have an overall transformation output
  // the transformation output is also the procedure output
  const transformationOutput = procedureOutput;

  return `
    <li>Procedure ${index + 1}
      <ul>
        <li>Selection
          <ul>
            <li>Selection steps:
              <ol>
                ${selections}
              </ol>
            </li>
            <li>Selection output:
              <ol>
                ${selectionOutput}
              </ol>
            </li>
          </ul>
        </li>
        <li>Transformation
          <ul>
            <li>Transformation steps:
              <ol>
                ${transformations}
              </ol>
            </li>
            <li>Transformation output:
              <ol>
                ${transformationOutput}
              </ol>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  `;
}

function makeSelectionHtml(
  selection: Parameters<typeof makeProcedureHtml>[0]["selections"][number]
): string {
  const type = selection.type;
  const config = selection.config;
  const output = selection.output.reduce((html: string, value) => {
    html += `<li>${value}</li>`;
    return html;
  }, "");
  return `
    <li>${type} selection
      <ul>
        <li>config: ${config}</li>
        <li>output:
          <ol>
            ${output}
          </ol>
        </li>
      </ul>
    </li>
  `;
}

function makeTransformationHtml(
  transformation: Parameters<
    typeof makeProcedureHtml
  >[0]["transformations"][number]
): string {
  const type = transformation.type;
  const config = transformation.config;
  const itemwise = transformation.itemwise;
  const output = transformation.output.reduce((html: string, value) => {
    html += `<li>${value}</li>`;
    return html;
  }, "");
  return `
    <li>${type} transformation
      <ul>
        <li>config: ${config}</li>
        <li>itemwise: ${itemwise}</li>
        <li>output:
          <ol>
            ${output}
          </ol>
        </li>
      </ul>
    </li>
  `;
}
