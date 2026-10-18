import { React } from "@vendetta/metro/common";
import { Forms, General } from "@vendetta/ui/components";
import { storage } from "@vendetta/plugin";
import { Rule } from "./types";

const { FormSection, FormInput, FormRow } = Forms;
const { ScrollView, Button, View } = General;

export default function Settings() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const rules: Rule[] = storage.rules ?? [];

  const updateRule = (index: number, key: keyof Rule, value: any) => {
    rules[index][key] = value;
    storage.rules = rules;
    forceUpdate();
  };

  const addRule = () => {
    storage.rules = [
      ...rules,
      { sourceDomain: "", targetDomains: [], keepParams: ["img_index"] },
    ];
    forceUpdate();
  };

  const deleteRule = (index: number) => {
    storage.rules = rules.filter((_, i) => i !== index);
    forceUpdate();
  };

  return (
    <ScrollView style={{ padding: 12 }}>
      {rules.map((rule, idx) => (
        <FormSection key={idx} title={`Rule #${idx + 1}`}>
          <FormInput
            title="Source Domain"
            placeholder="instagram.com or x.com"
            value={rule.sourceDomain}
            onChange={(val: string) => updateRule(idx, "sourceDomain", val)}
          />
          <FormInput
            title="Target Domains (comma-separated)"
            placeholder="website1.com, website2.com"
            value={rule.targetDomains.join(", ")}
            onChange={(val: string) =>
              updateRule(
                idx,
                "targetDomains",
                val.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
          />
          <FormInput
            title="Keep Parameters (comma-separated)"
            placeholder="img_index"
            value={rule.keepParams.join(", ")}
            onChange={(val: string) =>
              updateRule(
                idx,
                "keepParams",
                val.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
          />
          <Button
            text="Delete Rule"
            color="red"
            onPress={() => deleteRule(idx)}
            style={{ marginVertical: 8 }}
          />
        </FormSection>
      ))}

      <Button text="Add New Rule" onPress={addRule} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}