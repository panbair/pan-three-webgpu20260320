f = open(r'D:\work20240226\rcs-20250311\three-gpu-effect20260319\src\views\game-text\index.vue', encoding='utf-8')
lines = f.readlines()
f.close()
with open(r'D:\work20240226\rcs-20250311\three-gpu-effect20260319\src\views\game-text\index.vue', 'w', encoding='utf-8') as out:
    out.writelines(lines[:2466])
print(f"Done. Total lines written: {len(lines[:2466])}")
