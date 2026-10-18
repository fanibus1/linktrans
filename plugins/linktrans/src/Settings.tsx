import { React } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { Forms, General } from "@vendetta/ui/components";
import { storage } from "@vendetta/plugin";
import { Rule } from "./types";

const { FormSection, FormInput } = Forms;
const { ScrollView, Button, View } = General;

// Resolve React Native's core Keyboard module
const RNKeyboard = findByProps("dismiss", "addListener");

export default function Settings() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    if (!RNKeyboard?.addListener) return;

    const showSub = RNKeyboard.addListener("keyboardDidShow", (e: any) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 300);
    });

    const hideSub = RNKeyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
    };
  }, []);

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
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, padding: 12 }}
        contentContainerStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
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
            <View style={{ marginVertical: 8 }}>
              <Button
                title="Delete Rule"
                color="#ED4245"
                onPress={() => deleteRule(idx)}
              />
            </View>
          </FormSection>
        ))}

        <View style={{ marginTop: 16, marginBottom: 32 }}>
          <Button title="Add New Rule" onPress={addRule} />
        </View>
      </ScrollView>
    </View>
  );
}