import { React } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { Forms, General } from "@vendetta/ui/components";
import { storage } from "@vendetta/plugin";
import { Rule } from "./types";

const { FormSection, FormInput } = Forms;
const { ScrollView, Button, View, Text } = General;

const RNKeyboard = findByProps("dismiss", "addListener");
const Alert = findByProps("alert");

export default function Settings() {
  // Local state copy of rules for Save/Cancel transactions
  const [rules, setRules] = React.useState<Rule[]>(() =>
    JSON.parse(JSON.stringify(storage.rules ?? []))
  );
  const [hasChanges, setHasChanges] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  const scrollRef = React.useRef<any>(null);
  // Store measured vertical offsets for each input
  const inputPositions = React.useRef<{ [key: string]: number }>({});

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

  const updateRule = (index: number, key: keyof Rule, value: any) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [key]: value };
    setRules(updated);
    setHasChanges(true);
  };

  const addRule = () => {
    setRules([
      ...rules,
      { sourceDomain: "", targetDomains: [], keepParams: ["img_index"] },
    ]);
    setHasChanges(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const confirmDeleteRule = (index: number) => {
    const target = rules[index]?.sourceDomain || `Rule #${index + 1}`;

    const executeDelete = () => {
      setRules(rules.filter((_, i) => i !== index));
      setHasChanges(true);
    };

    if (Alert?.alert) {
      Alert.alert(
        "Delete Rule",
        `Are you sure you want to delete "${target}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete },
        ]
      );
    } else {
      executeDelete();
    }
  };

  const handleSave = () => {
    storage.rules = JSON.parse(JSON.stringify(rules));
    setHasChanges(false);
    RNKeyboard?.dismiss?.();
    if (Alert?.alert) {
      Alert.alert("Success", "Settings saved successfully.");
    }
  };

  const handleCancel = () => {
    setRules(JSON.parse(JSON.stringify(storage.rules ?? [])));
    setHasChanges(false);
    RNKeyboard?.dismiss?.();
  };

  // Registers the absolute Y offset relative to the ScrollView content canvas
  const saveLayout = (key: string, e: any) => {
    inputPositions.current[key] = e.nativeEvent.layout.y;
  };

  // Immediate scroll to recorded position on focus
  const scrollToField = (key: string) => {
    const y = inputPositions.current[key];
    if (typeof y === "number") {
      // Offset by 60px so label and surrounding block are visible
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Save / Cancel Bar */}
      {hasChanges && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 12,
            backgroundColor: "#202225",
            borderBottomWidth: 1,
            borderBottomColor: "#4f545c",
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "bold" }}>
            Unsaved Changes
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="Cancel" color="#747f8d" onPress={handleCancel} />
            <Button title="Save" color="#5865F2" onPress={handleSave} />
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, padding: 12 }}
        contentContainerStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 140 : 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {rules.map((rule, idx) => (
          <FormSection
            key={idx}
            title={`Rule #${idx + 1}`}
            onLayout={(e: any) => saveLayout(`section_${idx}`, e)}
          >
            <View
              onLayout={(e: any) => saveLayout(`rule_${idx}_source`, e)}
              onFocus={() => scrollToField(`rule_${idx}_source`)}
            >
              <FormInput
                title="Source Domain"
                placeholder="instagram.com or x.com"
                value={rule.sourceDomain}
                onChange={(val: string) => updateRule(idx, "sourceDomain", val)}
              />
            </View>

            <View
              onLayout={(e: any) => saveLayout(`rule_${idx}_target`, e)}
              onFocus={() => scrollToField(`rule_${idx}_target`)}
            >
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
            </View>

            <View
              onLayout={(e: any) => saveLayout(`rule_${idx}_params`, e)}
              onFocus={() => scrollToField(`rule_${idx}_params`)}
            >
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
            </View>

            <View style={{ marginVertical: 8 }}>
              <Button
                title="Delete Rule"
                color="#ED4245"
                onPress={() => confirmDeleteRule(idx)}
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