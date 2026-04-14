from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.app.models.article import Article
from backend.app.models.drug import Drug


DRUG_SEED = [
    {
        "name": "布洛芬缓释胶囊",
        "scientific_name": "Ibuprofen Sustained-Release Capsules",
        "drug_type": "OTC",
        "description": "用于缓解轻至中度疼痛，如关节痛、肌肉痛、偏头痛、牙痛以及普通感冒引起的发热。",
        "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80",
        "dosage": "1 粒 / 每日 2 次",
        "packaging": "0.3g x 24 粒",
        "indications": ["关节痛", "肌肉痛", "发热"],
        "ai_insight": "适合用于短期疼痛和发热控制，建议餐后服用，若连续高热超过 48 小时应及时就医。",
    },
    {
        "name": "阿莫西林克拉维酸钾片",
        "scientific_name": "Amoxicillin and Clavulanate Potassium Tablets",
        "drug_type": "RX",
        "description": "常用于敏感菌导致的呼吸道感染、中耳炎、鼻窦炎、泌尿系统感染等。",
        "image_url": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=900&q=80",
        "dosage": "1 片 / 每日 3 次",
        "packaging": "0.457g x 12 片",
        "indications": ["鼻窦炎", "中耳炎", "泌尿系统感染"],
        "ai_insight": "抗生素需遵循疗程完整服用，对青霉素类过敏者应避免使用，并遵医嘱评估适应症。",
    },
    {
        "name": "氯雷他定片",
        "scientific_name": "Loratadine Tablets",
        "drug_type": "OTC",
        "description": "用于缓解过敏性鼻炎、荨麻疹等过敏反应引起的打喷嚏、流涕和瘙痒。",
        "image_url": "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=900&q=80",
        "dosage": "1 片 / 每日 1 次",
        "packaging": "10mg x 6 片",
        "indications": ["过敏性鼻炎", "荨麻疹", "皮肤瘙痒"],
        "ai_insight": "适合白天使用，镇静作用相对较低，若伴随气喘或喉头水肿应立即线下就医。",
    },
]


ARTICLE_SEED = [
    {
        "title": "AI 在早期肺癌筛查中的应用进入临床验证阶段",
        "category": "研究进展",
        "excerpt": "多中心研究显示，融合影像与临床指标的模型在早期高风险肺结节识别中取得了稳定表现。",
        "content": "最新发布的多中心研究表明，结合 CT 影像、吸烟史和家族史的辅助筛查模型，在早期肺结节风险分层中具有较高参考价值。研究团队强调，AI 不替代临床判断，而是帮助医生更早发现需要进一步随访的高风险患者。",
        "image_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
        "author": "张慧敏 博士",
        "published_at": datetime(2026, 4, 1, tzinfo=timezone.utc),
        "read_time": "8 分钟",
        "tags": ["人工智能", "肺癌筛查", "临床研究"],
        "featured": True,
    },
    {
        "title": "春季过敏高发，如何做好鼻炎日常管理",
        "category": "健康提醒",
        "excerpt": "从居家清洁、外出防护到用药时机，系统整理春季过敏管理的几个关键动作。",
        "content": "对于季节性过敏人群，减少花粉暴露和规律使用抗过敏药物同样重要。医生建议，在症状明显前就开始预防性用药，并结合空气净化、鼻腔冲洗等方式降低刺激。",
        "image_url": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80",
        "author": "王晨 医师",
        "published_at": datetime(2026, 3, 28, tzinfo=timezone.utc),
        "read_time": "5 分钟",
        "tags": ["过敏", "鼻炎", "春季健康"],
        "featured": False,
    },
    {
        "title": "新版医保目录对创新药可及性带来的影响",
        "category": "政策更新",
        "excerpt": "多类慢病与肿瘤创新药被纳入支付范围，患者用药可及性与经济性出现改善。",
        "content": "随着新版医保目录实施，部分创新药物进入报销范围，给慢病和肿瘤患者带来了新的治疗选择。医疗机构也在同步优化处方路径和药事管理。",
        "image_url": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
        "author": "李然 编辑",
        "published_at": datetime(2026, 3, 24, tzinfo=timezone.utc),
        "read_time": "6 分钟",
        "tags": ["医保", "创新药", "政策"],
        "featured": False,
    },
    {
        "title": "数字时代的心理健康管理，从屏幕压力中找回节奏",
        "category": "心理健康",
        "excerpt": "长期高强度线上工作可能影响睡眠、专注力和情绪稳定，建立节律比硬扛更重要。",
        "content": "心理咨询师建议，将工作通知分时段处理、增加离屏时间和固定睡眠窗口，比零散休息更能帮助大脑恢复。若持续出现情绪低落或焦虑，应及时寻求专业支持。",
        "image_url": "https://images.unsplash.com/photo-1493836512294-502baa1986e2?auto=format&fit=crop&w=1200&q=80",
        "author": "陈楚 心理咨询师",
        "published_at": datetime(2026, 3, 18, tzinfo=timezone.utc),
        "read_time": "7 分钟",
        "tags": ["心理健康", "压力管理", "睡眠"],
        "featured": False,
    },
]


def seed_reference_data(session: Session) -> None:
    if session.query(Drug).count() == 0:
        session.add_all([Drug(**item) for item in DRUG_SEED])
    if session.query(Article).count() == 0:
        session.add_all([Article(**item) for item in ARTICLE_SEED])
