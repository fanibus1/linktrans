import { React, Navigation } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { Forms, General } from "@vendetta/ui/components";
import { storage } from "@vendetta/plugin";
import { Rule } from "./types";

const { FormSection, FormInput } = Forms;
const { ScrollView, Button, View, Text } = General;

const RNKeyboard = findByProps("dismiss", "addListener");
const Alert = findByProps("alert");
const BackHandler = findByProps("addEventListener", "exitApp");

export default function Settings() {
  const [rules, setRules] = React.useState<Rule[]>(() =>
    JSON.parse(JSON.stringify(storage.rules ?? []))
  );
  const [hasChanges, setHasChanges] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  const scrollRef = React.useRef<any>(null);

  // References to keep layout positions and clean state access
  const sectionPositions = React.useRef<{ [key: number]: number }>({});
  const fieldRelativePositions = React.useRef<{ [key: string]: number }>({});
  const hasChangesRef = React.useRef(false);
  const rulesRef = React.useRef(rules);

  hasChangesRef.current = hasChanges;
  rulesRef.current = rules;

  // Track keyboard dimensions
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

  const handleSave = () => {
    storage.rules = JSON.parse(JSON.stringify(rulesRef.current));
    setHasChanges(false);
    RNKeyboard?.dismiss?.();
    Alert?.alert?.("Success", "Settings saved successfully.");
  };

  const handleCancel = () => {
    setRules(JSON.parse(JSON.stringify(storage.rules ?? [])));
    setHasChanges(false);
    RNKeyboard?.dismiss?.();
  };

  // Intercept back navigation when unsaved changes exist
  React.useEffect(() => {
    if (!BackHandler?.addEventListener) return;

    const onBackPress = () => {
      if (hasChangesRef.current) {
        Alert?.alert?.(
          "Unsaved Changes",
          "You have unsaved changes. Do you want to save before leaving?",
          [
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                hasChangesRef.current = false;
                Navigation?.pop?.();
              },
            },
            { text: "Cancel", style: "cancel" },
            {
              text: "Save",
              onPress: () => {
                handleSave();
                Navigation?.pop?.();
              },
            },
          ]
        );
        return true; // Stop default back navigation
      }
      return false;
    };

    const backSub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backSub?.remove?.();
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
      { sourceDomain: "", targetDomains: [], keepParams: [] },
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

  // Cumulative scroll offset: section Y + input Y within section
  const scrollToField = (sectionIdx: number, fieldKey: string) => {
    const secY = sectionPositions.current[sectionIdx] ?? 0;
    const fieldY = fieldRelativePositions.current[`${sectionIdx}_${fieldKey}`] ?? 0;
    const absoluteTargetY = secY + fieldY;

    // Margin ensures the field header is comfortably visible above keyboard
    const targetY = Math.max(0, absoluteTargetY - 40);

    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    }, 100);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Top Bar: Cancel (Left) - Unsaved Changes (Center) - Save (Right) */}
      {hasChanges && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: "#202225",
            borderBottomWidth: 1,
            borderBottomColor: "#4f545c",
          }}
        >
          <View style={{ width: 80, alignItems: "flex-start" }}>
            <Button title="Cancel" color="#747f8d" onPress={handleCancel} />
          </View>

          <Text
            style={{
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            Unsaved Changes
          </Text>

          <View style={{ width: 80, alignItems: "flex-end" }}>
            <Button title="Save" color="#5865F2" onPress={handleSave} />
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, padding: 12 }}
        contentContainerStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 200 : 60,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {rules.map((rule, idx) => (
          <View
            key={idx}
            onLayout={(e: any) => {
              sectionPositions.current[idx] = e.nativeEvent.layout.y;
            }}
          >
            <FormSection 
              title={`Rule #${idx + 1}${rule.sourceDomain?.trim() ? `: ${rule.sourceDomain.trim()}` : ""}`}
            >
              <View
                onLayout={(e: any) => {
                  fieldRelativePositions.current[`${idx}_source`] =
                    e.nativeEvent.layout.y;
                }}
                onFocus={() => scrollToField(idx, "source")}
              >
                <FormInput
                  title="Source Domain"
                  placeholder="instagram.com or x.com"
                  value={rule.sourceDomain}
                  onChange={(val: string) => updateRule(idx, "sourceDomain", val)}
                />
              </View>

              <View
                onLayout={(e: any) => {
                  fieldRelativePositions.current[`${idx}_target`] =
                    e.nativeEvent.layout.y;
                }}
                onFocus={() => scrollToField(idx, "target")}
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
                onLayout={(e: any) => {
                  fieldRelativePositions.current[`${idx}_params`] =
                    e.nativeEvent.layout.y;
                }}
                onFocus={() => scrollToField(idx, "params")}
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
          </View>
        ))}

        <View style={{ marginTop: 16, marginBottom: 32 }}>
          <Button title="Add New Rule" onPress={addRule} />
        </View>
      </ScrollView>
    </View>
  );
}