import re

with open('.kiro/specs/dental-clinic-management/tasks.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\[\s*\]\*', '[ ]', content)

with open('.kiro/specs/dental-clinic-management/tasks.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed all optional markers")
