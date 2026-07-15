import os
import re

directory = r"c:\Users\asus\OneDrive\Desktop\Circle Mini-Battle\js"

patterns = [
    (r"const useLOD = .*?;", r"const useLOD = false;"),
    (r"const useUltraLOD = .*?;", r"const useUltraLOD = false;"),
    (r"const useAggressiveMode = .*?;", r"const useAggressiveMode = false;"),
    (r"const useAggressiveParticleMode = .*?;", r"const useAggressiveParticleMode = false;")
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for p, r in patterns:
                new_content = re.sub(p, r, new_content)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
