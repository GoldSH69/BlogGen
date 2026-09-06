import json
import urllib.request
import urllib.error
import sys

def main():
    print("=" * 65)
    print("🔍 Google Gemini API 키 - 사용 가능 모델 및 이미지 생성 진단기")
    print("=" * 65)
    
    try:
        api_key = input("\n🔑 Gemini API 키를 입력하세요: ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\n취소되었습니다.")
        return

    if not api_key:
        print("❌ API 키가 입력되지 않았습니다. 프로그램을 종료합니다.")
        return

    print("\n1️⃣ 구글 서버에서 사용 가능한 모델 목록을 조회하는 중...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"\n❌ API 호출 실패 (HTTP {e.code}):\n{err_msg}")
        return
    except Exception as e:
        print(f"\n❌ 네트워크 오류: {e}")
        return

    models = data.get("models", [])
    print(f"✅ 조회 성공! 현재 키로 접근 가능한 모델 총 {len(models)}개 발견.\n")

    image_candidate_models = []
    text_models = []

    print("-" * 65)
    print(f"{'모델 ID':<40} | {'지원 기능'}")
    print("-" * 65)

    for m in models:
        name = m.get("name", "").replace("models/", "")
        methods = ", ".join(m.get("supportedGenerationMethods", []))
        desc = m.get("description", "")
        
        # Check if model is image related
        is_image_related = "image" in name.lower() or "imagen" in name.lower() or "image" in desc.lower()
        if is_image_related:
            image_candidate_models.append(name)
            print(f"🎨 [이미지 후보] {name:<27} | {methods}")
        else:
            text_models.append(name)
            print(f"📝 {name:<38} | {methods}")

    print("-" * 65)
    print(f"\n📊 분류 결과:")
    print(f"- 텍스트/멀티모달 모델: {len(text_models)}개")
    print(f"- 이미지 관련 후보 모델: {len(image_candidate_models)}개 ({', '.join(image_candidate_models) if image_candidate_models else '없음'})")

    print("\n2️⃣ 이미지 생성 지원 여부 및 무료 쿼터(429 여부) 정밀 테스트...")

    test_models = list(image_candidate_models)
    
    # Also add popular flash models to test if responseModalities: ["TEXT", "IMAGE"] works
    for candidate in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
        if candidate in text_models and candidate not in test_models:
            test_models.append(candidate)

    if not test_models:
        print("❌ 테스트할 대상 모델이 없습니다.")
        return

    print("-" * 65)
    
    for model in test_models:
        print(f"\n🧪 [{model}] 테스트 중...")
        
        # Method A: generateContent with responseModalities: ["TEXT", "IMAGE"]
        test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": "A simple red apple on a clean wooden table"}]}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"]
            }
        }
        
        try:
            req_data = json.dumps(payload).encode("utf-8")
            t_req = urllib.request.Request(test_url, data=req_data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(t_req, timeout=25) as t_res:
                t_json = json.loads(t_res.read().decode("utf-8"))
                parts = t_json.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                has_image = any("inlineData" in p for p in parts)
                if has_image:
                    print(f"  🎉 SUCCESS! generateContent로 이미지 생성 성공! (무료 사용 가능)")
                else:
                    print(f"  ⚠️ 응답 수신 성공(200), 그러나 이미지는 없음 (텍스트만 반환됨)")
        except urllib.error.HTTPError as he:
            h_err = he.read().decode("utf-8")
            try:
                parsed_err = json.loads(h_err)
                err_code = parsed_err.get("error", {}).get("code", he.code)
                err_msg = parsed_err.get("error", {}).get("message", h_err[:120])
                print(f"  ❌ generateContent 실패 (HTTP {err_code}): {err_msg}")
            except Exception:
                print(f"  ❌ generateContent 실패 (HTTP {he.code}): {h_err[:120]}")
        except Exception as ex:
            print(f"  ❌ 오류: {ex}")

        # Method B: If name contains imagen, also try :predict endpoint
        if "imagen" in model.lower():
            predict_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={api_key}"
            p_payload = {
                "instances": [{"prompt": "A simple red apple on a clean wooden table"}],
                "parameters": {"sampleCount": 1, "aspectRatio": "1:1"}
            }
            try:
                p_data = json.dumps(p_payload).encode("utf-8")
                p_req = urllib.request.Request(predict_url, data=p_data, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(p_req, timeout=25) as p_res:
                    p_json = json.loads(p_res.read().decode("utf-8"))
                    if p_json.get("predictions"):
                        print(f"  🎉 SUCCESS! :predict(Imagen)로 이미지 생성 성공! (무료 사용 가능)")
                    else:
                        print(f"  ⚠️ predict 응답에 이미지 없음")
            except urllib.error.HTTPError as phe:
                ph_err = phe.read().decode("utf-8")
                try:
                    parsed_p_err = json.loads(ph_err)
                    p_code = parsed_p_err.get("error", {}).get("code", phe.code)
                    p_msg = parsed_p_err.get("error", {}).get("message", ph_err[:120])
                    print(f"  ❌ :predict 실패 (HTTP {p_code}): {p_msg}")
                except Exception:
                    print(f"  ❌ :predict 실패 (HTTP {phe.code}): {ph_err[:120]}")
            except Exception as ex:
                print(f"  ❌ 오류: {ex}")

    print("\n" + "=" * 65)
    print("🏁 진단이 완료되었습니다.")
    print("=" * 65)

if __name__ == "__main__":
    main()
