
import os
import re

FRONTEND_DIR = "/home/usuario/01_DockerData/03_Frontend/src"
UI_DIR = os.path.join(FRONTEND_DIR, "components/ui")

def get_existing_ui_components():
    if not os.path.exists(UI_DIR):
        print(f"UI Directory not found: {UI_DIR}")
        return set()
    return {f.replace(".tsx", "") for f in os.listdir(UI_DIR) if f.endswith(".tsx")}

def check_imports():
    existing_components = get_existing_ui_components()
    print(f"Found {len(existing_components)} existing UI components.")

    missing = set()
    
    # Regex to capture import paths like "@/components/ui/button"
    import_pattern = re.compile(r'from\s+["\']@/components/ui/([^"\']+)["\']')

    for root, _, files in os.walk(FRONTEND_DIR):
        for file in files:
            if file.endswith(".tsx") or file.endswith(".ts"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                        for i, line in enumerate(lines):
                            matches = import_pattern.findall(line)
                            for match in matches:
                                component_name = match
                                if component_name not in existing_components:
                                    print(f"MISSING: {component_name} imported in {path}:{i+1}")
                                    missing.add(component_name)
                except Exception as e:
                    print(f"Error reading {path}: {e}")

    if not missing:
        print("All UI imports resolved successfully!")
    else:
        print("\nSummary of missing components:")
        for m in missing:
            print(f"- {m}")

if __name__ == "__main__":
    check_imports()
