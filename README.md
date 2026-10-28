# DSH Knowledge Workshop 馃摎

> DeepSeek Harness 鐭ヨ瘑搴撳伐浣滃彴鎻掍欢 鈥?鍗＄墖寮?Markdown 绗旇绠＄悊锛屾敮鎸佸浘鐗?瑙嗛涓婁紶銆丄gent 宸ュ叿璋冪敤銆乑IP 瀵煎叆瀵煎嚭銆?
[![GitHub stars](https://img.shields.io/github/stars/wangrong196/kk?style=social)](https://github.com/wangrong196/kk)
[![License](https://img.shields.io/badge/License-Proprietary-blue)](./LICENSE.md)

## 鍔熻兘鐗规€?
| 鍔熻兘 | 璇存槑 |
|------|------|
| 馃摎 宸︿晶鏍忓叆鍙?| 鍘熺敓 sidebar.panellist 娉ㄥ唽锛屼竴閿墦寮€ |
| 馃儚 鍗＄墖寮忓垪琛?| 鎸夊垎绫绘祻瑙堬紙椤圭洰/浠ｇ爜/璁捐/浜у搧/瀛︿範/鐢熸椿/鍏朵粬锛?|
| 馃攳 瀹炴椂鎼滅储 | 鍏ㄦ枃鎼滅储锛屾敮鎸佸垎绫荤瓫閫?|
| 鉁?鏂板缓 / 鉁忥笍 缂栬緫 / 馃棏锔?鍒犻櫎 | 鐩存帴钀界洏鍒扮煡璇嗗簱鐩綍锛孧arkdown 鏍煎紡 |
| 馃柤锔?鍥剧墖 / 馃幀 瑙嗛 | 鏈湴鏂囦欢涓婁紶锛宐ase64 鍐呰仈瀛樺偍鍒?Markdown |
| 馃摜 瀵煎叆 | 鍗曠瘒 Markdown / JSON锛屾垨鏁村簱 ZIP |
| 馃摛 瀵煎嚭 | 鍗曠瘒鎴栨暣搴?ZIP锛堝惈濯掍綋鏂囦欢锛?|
| 馃 Agent 宸ュ叿 | 9 涓煡璇嗗伐鍏蜂緵 AI Agent 璋冪敤 |

## 蹇€熷紑濮?
### 瀹夎

**Windows (PowerShell):**
```powershell
cd knowledge-workshop-plugin
.\install.ps1
```

**Linux/macOS (Bash):**
```bash
cd knowledge-workshop-plugin
chmod +x install.sh
./install.sh --kb-root "$HOME/.dsh/knowledge"
```

### 鍦?DSH 涓惎鐢?
1. 鎵撳紑 DSH 鈫?璁剧疆 鈫?鎻掍欢
2. 鐐瑰嚮銆屽畨瑁呮湰鍦版彃浠躲€嶏紝閫夋嫨 `dsh-knowledge-workshop` 鐩綍
3. 鍚敤鎻掍欢
4. 鍒锋柊 DSH Web GUI 椤甸潰

宸︿晶鏍忓嚭鐜?馃摎 鍥炬爣鍗冲畨瑁呮垚鍔熴€?
## 鐜鍙橀噺

| 鍙橀噺 | 璇存槑 | 榛樿鍊?|
|------|------|--------|
| `KNOWLEDGE_WORKSHOP_ROOT` | 鐭ヨ瘑搴撴牴鐩綍 | `~/.dsh/knowledge-workshop` |

鍒涘缓 `.env` 鏂囦欢鎴栬缃郴缁熺幆澧冨彉閲忓彲鑷畾涔夎矾寰勩€?
## Agent 宸ュ叿

```javascript
knowledge_list({ category: "鍏ㄩ儴", limit: 50 })
knowledge_get({ id: "椤圭洰/xxx-123" })
knowledge_create({ title: "鏍囬", content: "姝ｆ枃", category: "鍏朵粬" })
knowledge_update({ id: "椤圭洰/xxx-123", title: "鏂版爣棰?, content: "鏂板唴瀹? })
knowledge_delete({ id: "椤圭洰/xxx-123" })
knowledge_import({ format: "markdown", content: "# 鏍囬\n\n姝ｆ枃" })
knowledge_export({ format: "zip" })
knowledge_search({ query: "鍏抽敭璇?, limit: 10 })
knowledge_stats()
```

## 渚濊禆

绾?Node.js 鍐呯疆妯″潡锛屾棤澶栭儴 npm 渚濊禆銆?
## 璁稿彲璇?
鏈蒋浠朵负涓撴湁杞欢锛圥roprietary锛夛紝浠呬緵涓汉瀛︿範浣跨敤銆傚晢涓氭巿鏉冭鑱旂郴浣滆€呫€?
See [LICENSE.md](./LICENSE.md)

