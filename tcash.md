第一部分 引言
1. 目的
	本详细设计文档旨在为TCash及其相关系统的开发、部署及后续维护提供系统化、可操作的技术蓝图和实现规范。具体目标包括：
	系统架构说明：明确TCash及其系统的总体架构、模块划分及交互关系，便于开发团队和架构师在后续阶段实施或扩展。
	核心功能与逻辑：对系统关键功能（如价格稳定算法、抵押物管理、清算机制等）的实现方式、数据流动及逻辑过程进行细化描述，确保参与者对系统运作方式达成一致。
	接口定义与集成：说明内部模块之间以及与外部系统（支付网关、Oracle预言机等）的接口形式、通信协议和数据格式，确保兼容性与可扩展性。
	安全与合规策略：在技术实现层面，提出关于智能合约安全、系统安全、KYC/AML 等合规要求的具体措施或技术方案，减少潜在风险并保证系统稳健运行。
	性能与可维护性：通过对核心模块的负载、扩容、监控及容错机制进行详细设计，为未来的功能升级和性能优化奠定基础。
	通过本详细设计文档，项目相关方（包括开发人员、测试人员、运维人员和合规团队等）能够高效、准确地理解并执行TCash 及其相关系统的设计思路和技术方案，确保项目各环节的实施过程清晰、有序且具备可追溯性。

2. 范围
	本设计文档的适用范围聚焦于稳定币系统从底层智能合约到接口调用的技术实现与集成，涵盖总体架构与模块设计、功能与流程定义（如发行、赎回、价格治理与抵押物管理等）、安全与合规策略（包括智能合约审计、私钥管理与KYC/AML），以及接口定义与通信协议、部署与运维等方面，旨在为系统提供可拓展且可维护的技术方案

3. 定义、术语和缩略语
	为确保在后续设计描述中使用的术语具有一致且明确的含义，特对部分关键概念进行定义说明：

多重签名（Multisig）
	在交易或合约执行时需要多个签名者共同授权才能生效的机制，以加强资金和合约操作的安全性。

DAO（Decentralized Autonomous Organization）
	以智能合约和代币经济模型为基础，通过社区投票和共识来进行治理和管理的去中心化自治组织。

个人授信额度（PCL, Personal Credit Limit）
	金融机构针对个人（借款人）核定的可使用信用额度上限。
	在产品文档中，该名称为 Max Borrowable。

个人可贷余额(ALB, Available Loan Balance)
	基于个人授信额度及当前已用贷款额度计算后，尚可继续获得的剩余贷款额度。	产品文档中该名称为 Borrowable

风险系数(RF, Risk Factor)
	用于衡量某一主体或对象潜在风险水平的量化指标。

个人风险系数(PRF, Personal Risk Factor)
	用于评估个人信用、负债、还款能力等方面整体风险水平的量化指标。

系统风险系数(SRF, Systemic Risk Factor)
	用于衡量外部宏观经济、行业风险及整体市场波动等对系统层面造成潜在影响的量化指标。

综合风险系数(CRF, Comprehensive Risk Factor)
	综合个人（或企业）内部风险及外部环境风险的多维度评估结果所得的总体风险系数。
	产品文档中该名称为"综合风险因子"(英文 Risk Factors)

尚未偿还的贷款总量(含利息)(OLB, Outstanding Loan Balance)
	截至当前日期，尚未偿还的贷款本金和利息总额。

已经偿还的金额(含利息)(RA, Repaid Amount)
	截至当前日期，已偿还的贷款本金和利息的总额。

总计贷出的金额(含利息)(TLD, Total Loan Disbursed)
	已发放出去的贷款总金额，包括本金和相关利息。

个人结清的贷款笔数(NCL, Number of Cleared Loans)
	借款人已结清的贷款笔数（即所有已偿还完毕的贷款）。

个人贷款总笔数(TNL, Total Number of Loans)
	借款人的所有贷款笔数，包括已结清与未结清的贷款。

个人贷款总额(含利息)(TLA, Total Loan Amount)
	借款人当前所有贷款的总金额，包括本金与应付利息。(已扣除已经偿还的部分)

个人还款总额(TRA, Total Repayment Amount)
	借款人已支付的全部还款金额，包括本金与利息。

UNIT
	是Treasurenet区块链的原生加密货币，用于支付网络交易费用并为去中心化应用提供运行动力。

TCash 贷款日利率（TCASHDIR，TCash Daily Interest Rate）
	
TCash 贷款质押预警线(TCASHMCT, TCash Margin Call Threshold)

TCash 贷款质押清算线(TCASHLT, TCash Liquidation Threshold)

TCash 铸造状态(TCASHMS, TCash Mint Status)

TCash 还款周期(TCASHRC, TCash Repayment Cycle)

贷款利息结算次数(IST, interest settlement times)

第二部分 总体描述
1. 产品功能
1.1. TCash

	TCash是Treasurenet的稳定币，波动性最小的代币，创造之初锚定1美元，旨在为用户提供一种稳定且高效的数字货币。围绕TCash，Treasure为用户打造了一款可视化系统。这个系统旨在为大家提供一种方便易用的数字资产管理方式，让所有人都能够更加高效地管理其数字资产。
1.2 贷款功能
	该产品为持有 UNIT 代币（或其他已授权数字资产）的用户提供去中心化贷款服务，具体流程如下：
	抵押资产
	用户将 UNIT 或其他授权数字资产抵押至智能合约，以确定可获得的 TCash 贷款额度上限。
	确定授信额度
	系统会根据抵押物数量及当前市场价格，自动计算用户可借出的 TCash 额度。	
	发放贷款
	智能合约在验证抵押物与授信后，自动向用户的去中心化钱包发放相应数量的 TCash。
	动态风险控制
	合约会实时监控抵押率。如遇抵押物价值显著下跌或市场大幅波动，合约将触发相应风险管理机制（如提高抵押要求或发出预警），确保整体贷款安全。

1.3 还款功能
	获得 TCash 贷款后，用户可随时通过还款功能归还已借出的 TCash（或支持的其他代币），并取回抵押物，流程如下：
	还款金额计算
	需要偿还的金额取决于初始借贷本金、约定利率及借款时长等因素。
	发起还款请求
	用户通过调用还款智能合约接口，将所需偿还的 TCash（或其他代币）发送至合约地址。
	合约自动结算
	智能合约收到还款后，会自动核销用户的部分或全部债务；若用户全部还清贷款，本金所对应的抵押物将自动解冻并归还给用户。

1.4 竞拍功能
	为保证贷款系统的可持续运行，当借款人无法按时偿还贷款或抵押物价值不足以覆盖贷款时，智能合约可触发拍卖或清算机制。此时，第三方可通过竞拍获取抵押物，从而维持系统的整体资金安全：
	违约触发
	当借款人逾期或其抵押率跌破系统预设阈值时，触发智能合约进入拍卖流程。
	公开竞拍
	借款人的抵押物会被放置在公开市场或合约系统中进行竞拍，第三方可出价竞购抵押物。
	保证系统安全
	通过拍卖所得资金来偿还或部分偿还借款人的债务，避免坏账积累，保障系统的稳健运行。

2. 关联项目
2.1 合约
2.1.1 Github 地址
https://github.com/treasurenetprotocol/smart-contracts
branch: feature/2.0.1

2.2 用户交互前端页面
2.2.1 Github 地址
https://github.com/treasurenetprotocol/treasurenet-tnservices-servicesplatform-fe
branch: feature/1.0.2

2.3 用户交互后端服务
2.3.1 Github地址
https://github.com/treasurenetprotocol/treasurenet-tnservices-platform
branch: feature/2.1.2

2.4 tngateway
为前后端提供ABI等基础服务
为前后端提供由Dataprovider采集的数据接口服务
2.4.1 Github 地址
https://github.com/treasurenetprotocol/treasurenet-tnservices-tngateway
branch: feature/1.0.1

2.5 Data Provider
TN 通用数据采集服务(合约监听)
2.5.1 Github地址
https://github.com/treasurenetprotocol/treasurenet-tnservices-dataprovider
branch: feature/1.0.0


2.6 Feeder
TN Oracle模块 主要负责采集链下数据并将其发送给智能合约
2.6.1 Github地址
https://github.com/treasurenetprotocol/treasurenet-tnservices-feeder
branch: feature/2.1.1

2.7 DataProcess
	TN 生产商模块定时任务程序, 核心业务是把数据从客户的MSSQL中提取,进行数据清洗、整理、前置处理之后存入mongoDB数据库中供 DataUploader使用
2.7.1 Github地址
https://github.com/treasurenetprotocol/data-process
branch: feature/1.0.0

2.8 DataUploader
	TN 生产商模块定时任务程序, 核心业务是把经过DataProcess处理后的数据发送到区块链网络.
2.8.1 Github地址
https://github.com/treasurenetprotocol/data-upload 
branch: feature/1.0.0

2.9 测试脚本
	自动化测试工具的测试脚本
2.9.1 Github地址
https://github.com/treasurenetprotocol/AutoTestArk
branch: main



第三部分 详细设计
1. 系统架构设计
1.1 架构总览

1.2 架构要点
1.2.1 TAT
	TAT 作为标准 ERC20 代币，其获取流程涉及实体资产（如石油、天然气）或数字资产（如 ETH、BTC）经过矿井的申请准入、严格审核、获取并上传产量、政府数据核验以及铸造等诸多步骤。本项目确实需要 TAT 的相关数据用以参考，不过这并非此文档着重描述的要点，若想了解详情可参考 TAT 相关产品需求文档。

1.2.2 TN服务平台
	TN 服务平台乃是用户进行贷款、还款等一系列操作的用户交互页面，其中涵盖了前后端服务。需特别留意的是，该平台的后端服务依赖于 TNGateway API 来为其供应链上数据，并非自行采集。区分的准则在于：凡是以链为数据来源的，由 Dataprovider 采集并通过 TNGateway API 发送至后端服务，后端服务仅进行数据转发；而以本平台为数据来源的（例如登录），则由本平台后端服务予以处理和存储。

1.2.3 TNGateway & Dataprovider
	TNGateway 为 TN 项目的全部前端和后端服务供应链上数据来源，而其中的自模块 Dataprovider 被精心设计成专门用于采集链上信息的独立 repo。
	
1.3 核心内容说明
1.3.1 用户界面
1. 功能
	为用户提供TCash相关金融的可视化操作界面, 如贷款、还款、拍卖等
	为用户提供TCash相关金融操作的查询和历史交易记录的查询页面
2. 交互
	利用metamask构建、签署和发送交易到区块链网络
	利用Restful API的方式与后台服务的对外接口进行通信

1.3.2 TCash合约
1. 功能
	贷款:
		借款额度计算：根据用户抵押资产的价值或信用评分等，计算可借款额度。
		抵押和清算机制：当抵押物价值不足以覆盖借款时，合约执行自动清算或追加抵押操作，确保系统的资金安全。
		灵活还款：提供全额提前还款或分期还款等方式，以满足用户多样化的需求。
	拍卖:
		抵押品流动性处理：在借款人违约或抵押品价值不足时，TCash可自动触发拍卖流程，将抵押资产拍卖给出价最高的买家。
		透明、公平：拍卖过程在区块链上公开可查，确保所有参与者看到相同的竞价信息。
	数据查询和统计:
		账户余额和负债查询：用户可随时查看自己在TCash中的存款余额、未偿还贷款、抵押物状况等信息。
		系统状态与历史记录：能够查询拍卖历史、系统总体流动性、违约率等关键信息，方便决策或审计。

2. 交互
	TCash通常通过区块链钱包地址识别用户，无需额外的中心化注册流程。
	对拍卖发起、抵押操作、清算操作等敏感功能进行权限限制或多重签名（Multi-Sig）验证。
	智能合约根据已有的抵押物价值，计算最大可借款额度。
	还款完成后，合约自动解锁抵押物，并将剩余抵押物返还给用户。

1.4 关键流程
流程 1：质押代币并获取贷款
质押操作：用户将持有的数字资产（如 UNIT 等）抵押到智能合约中，并根据预先设定的抵押率获得相应的 TCash 贷款额度。
资产锁定：抵押物会被锁定在合约中，直至借款人还清贷款或触发清算。
流程 2：使用贷款参与金融活动
资金用途：用户获得的 TCash 贷款可用于多种投资、交易或流动性挖矿等去中心化金融（DeFi）活动。
关注抵押率：借款人需持续关注抵押物的价值及市场波动，以防抵押率因价格下跌而触发预警或清算。
流程 3：每日结算及利息产生
计息与债务更新：平台会根据约定的周期（如每日）计算利息并更新用户的总债务余额。
动态风控：若抵押物价值显著下降，系统会实时评估抵押率是否临近清算线，并根据风险策略采取相应措施（如预警提示）。
流程 4：部分还款或全额还款
自行还款：用户可随时归还部分或全部的 TCash 贷款，以降低债务规模。
降低清算风险：部分还款后，抵押率会提升，从而减少被清算的风险。
流程 5：预警与清算触发
预警提醒：当抵押率逼近预警线时，系统会提示用户追加抵押物或偿还部分贷款，以免抵押率进一步下降。
执行清算：若抵押率跌至清算线以下，系统将对抵押物执行清算操作，变现所得用于归还债务。
流程 6：拍卖阶段
进入竞拍：在清算过程中，抵押物将被放至拍卖系统，以公开竞价的方式回收资金。
债务结算：拍卖所得优先用于偿还借款人的债务，若有剩余资金，再退还给借款人。

2. 详细设计
2.1 ParameterInfo的改造
2.1.1 功能描述
	在 Governance 模块中的 ParameterInfo 合约里，可对相关配置参数进行初始化设置，并通过以下方式实现对参数的读取与修改：

	初始化配置：在部署或升级合约时，为各项参数赋予初始值。
	修改配置：通过多重签名（Multisig）调用 setPlatformConfig 函数，对参数进行动态调整。
	查询配置：任何人都可通过 getPlatformConfig 函数查询当前配置值，从而满足前端展示与其他合约调用的需要。
此机制能够确保平台核心参数的安全、透明和易维护。
2.1.2 参数说明
参数	参数名称	输入格式	初始值	有效范围	含义和说明
TCASHDIR	TCash贷款日利率	uint256	5	>0	由实际比例0.05% * 10000得出
TCASHMCT	预警线	uint256	750,000		75% * 10000
TCASHLT	清算线	uint256	500,000		50% * 10000
TCASHRC	还款周期	uint256	365		365次清算

2.2 ERC20 标准合约功能
2.2.1 功能描述
	TCash 继承自标准的 ERC20 智能合约（基于 OpenZeppelin 实现），从而具备与主流 ERC20 代币一致的基础功能（如余额查询、转账、授权等）。在此基础上，根据本项目需求为 TCash 增加了一些拓展功能，组成完整的 TCash 合约功能体系。

2.2.2 功能说明
2.2.2.1 ERC20标准功能
1. 继承合约
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
该合约继承自 OpenZeppelin 提供的 ERC20 合约，确保与标准 ERC20 代币的一致性。

2.功能要点
名称（name）: TCash
缩写（symbol）: TCASH
精度（decimals）: 18
	对应的最小计量单位为 1e18（即 atto-TCash）。

3 表示规范
最小单位称为 "atto-TCash"，记作 aTCash；1 TCash = 1e18 aTCash。
便于记忆和显示，可使用 "K"、"M"、"B" 等常见计量单位（例如：1K = 1,000 aTCash，1M = 1,000,000 aTCash，依此类推），具体可在前端或工具中进行格式化展示。

4 初始铸造
	初始铸造数量：1,000,000 个 TCash。
	初始接收账户：某指定账户（待定）。
	该方式可在合约部署时一次性完成，将代币分配至指定账户，用于后续运营或分发。

2.3 Feeder、Oracle业务逻辑调整
2.3.1 功能描述
	由于现有的FeederModule、Oracle没有关于检测价格并发起TCASH铸造锁定功能的特性,所以需要对其进行调整.
2.3.2 流程
	
2.3.3 调整简述
参数	参数名称	初始值	有效范围	含义和说明
TCASHMLP	TCASH铸造锁定价格	0		0: TCASH铸造状态为允许 !0: TCASH铸造状态为禁止
TCASHMLT	TCASH铸造锁定线	3,000	0-10000	30% * 10,000
TCASHMRST	TCASH 铸造恢复线	11,000		110% * 10,000
TCASHMS	TCASH铸造状态	true		(Oracle合约用) true:允许 false:禁止

	在 Feeder 正常上传价格之前，需先判定 TCash 铸造锁定价格是否为 0 。若价格为 0（这意味着此时 TCash 处于正常铸造状态），则依据历史价格来判断 1 小时跌幅是否超过 30%（此数值应当是可配置的），倘若达到这一跌幅，那么就将此时的价格作为 TCash 铸造锁定价格进行存储，同时向 Oracle 合约发送交易，把当前的 TCash 铸造状态（TCASHMS）标记为禁止（false）。而当价格逐步回升至 TCash 铸造锁定价格的 110%（该数值也应是可配置的）时，要将 TCash 铸造锁定价格存储为 0，并向 Oracle 合约发送交易，把当前的 TCash 铸造状态（TCASHMS）标记为允许（true）。

2.4 TAT业务逻辑调整
2.4.1 功能描述
	由于现有的TAT铸造功能(TAT._mint)没能记载铸造次数和近期的铸造记录,所以需要对其进行调整

2.4.2 流程


2.4.3 合约函数
2.4.3.1 setTATRecord
2.4.3.1.1 功能描述
	主要用途：存储并更新特定用户的 TAT（Token Airdrop/Token Allocation 或其他业务含义）记录。
	适用场景：由 ProductionData（或其他授权合约/账户）调用，用于记录用户在某年某月（年月合并为一个 uint256）所铸造的代币数量。
2.4.3.1.2 参数说明
参数	参数名称	参数类型	含义和说明
Input	account	address	用户地址
	amount	uint256	铸造代币数量
	month	uint256	年月
2.4.3.1.3 执行身份
仅ProductionData
2.4.3.1.4 接口说明
数据结构设计
建议在合约中维护一个类似 mapping(address => TATRecord) 的结构，其中 TATRecord 可以存储 最近 3 个年月的铸造代币数量。
多受益人场景
若存在多个受益人，需在业务逻辑中考虑如何区分不同受益人的记录。
按照产品需求此处仅处理井所有者的收益份额。
更新策略
当函数被调用时，需要先读取已有记录，更新对应年月的数据，然后将结果写回存储结构。
因为保留 3 个月的数据，在更新时需将最老的记录覆盖

2.4.3.2 getTATRecord
2.4.3.2.1 功能描述
	主要用途：向外部公开查询接口，供调用者查看特定用户在最近3个月内的 TAT铸造 记录。
2.4.3.2.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	address	用户地址
Output	months	uint256[]	返回的记录中对应的年月
	amounts	uint256[]	与 months 数组一一对应，表示各月的铸造数额
说明:
	months 和 amounts 的数组长度需保持一致，并与合约内部存储逻辑匹配。
2.4.3.2.3 执行身份
Public，任何人都可调用。

2.5 个人和系统参数
2.5.1 个人参数
2.5.1.1 参数说明
缩写	全称	中文含义	说明
PCL	Personal Credit Limit	个人授信额度	指金融机构针对个人（借款人）所核定的可使用信用额度上限。
不直接存储：需要时，调用 getTATRecord 并取其平均值×12 计算得出（若记录少于 2 条则由平均值×3 计算得出）。
ALB	Available Loan Balance	个人可贷余额	指基于授信额度及当前已用贷款额度计算后，个人还可以继续获得的贷款剩余额度。
产品文档中该名称为 Borrowable
不直接存储：需要时使用 PCL - TLA 得出。
NCL	Number of Cleared Loans	个人结清的贷款笔数	指借款人已经结清的贷款笔数，即所有已偿还完毕的贷款。
TNL	Total Number of Loans	个人贷款总笔数	指借款人所有贷款的总笔数，包括未结清和已结清的贷款。
TLA	Total Loan Amount	个人贷款总额(含利息)	指个人当前所有贷款的总金额，包括本金和应付的利息。
TRA	Total Repayment Amount	个人还款总额	指借款人已支付的总还款金额，包括本金和利息。
提示：
	表格中列出的参数中，PCL 与 ALB 并不直接在合约中存储，而是由其他信息推算获得。
	其余参数可根据业务需求选择性地在链上保存，以便随时查询和更新。

2.5.1.1 合约函数
2.5.1.1.1 _setPersonalLoanData
2.5.1.1.1.1 功能描述
	记录和更新个人参数信息。适用于需要在链上持久化存储的个人参数（如 NCL, TNL, TLA, TRA 等）。
2.5.1.1.1.2 参数
参数	参数名称	参数类型	含义和说明
Input	Key	str	用于区分需要修改的具体个人参数字段（如 TLA、TNL 等）。
	Value	uint256	对应参数的新值。

2.5.1.1.1.3 执行身份
内部

2.5.1.1.2 getPersonalLoanData
2.5.1.1.2.1 功能描述
	用于查询个人参数信息，通常由前端或其他合约调用，以便获取用户的相关贷款数据。
2.5.1.1.2.2 参数
参数	参数名称	参数类型	含义和说明
Output	NCL	uint256	个人已结清贷款笔数。
	TNL	uint256	个人贷款总笔数。
	TLA	uint256	个人贷款总额（含利息）。
	TRA	uint256	个人已偿还的总额。

2.5.1.1.2.3 执行身份
Public
2.5.1.1.2.4 存储逻辑
	数据需要以"个人地址"为维度进行存储，即 mapping(address => PersonalLoanData) 之类的结构，用于区分不同用户的数据。

2.5.2 系统参数
2.5.2.1 参数说明
缩写	全称	中文含义	说明
OLB	Outstanding Loan Balance	尚未偿还的贷款总量(含利息)	指截至当前日期，尚未偿还的贷款本金和利息总额。
RA	Repaid Amount	已经偿还的金额(含利息)	指截至当前日期，已偿还的贷款本金和利息的总额。
TLD	Total Loan Disbursed	总计贷出的金额(含利息)	指已经发放出去的贷款总金额，包括贷款本金和相关利息。

2.5.2.2 合约函数
2.5.2.2.1 _setSysLoanData
2.5.2.2.1.1 功能描述
	记录和更新系统全局参数信息，包含尚未偿还贷款总量、已偿还金额、总计贷款发放等指标。
2.5.2.2.1.2 参数
参数	参数名称	参数类型	含义和说明
Input	Key	str	用于区分需要修改的具体系统参数字段（如 OLB, RA, TLD 等）。
	Value	uint256	对应参数的新值。

2.5.2.2.1.3 执行身份
内部

2.5.2.2.2 getSysLoanData
2.5.2.2.2.1 功能描述
	查询系统全局参数信息，通常由前端或其他合约调用，用于展示或分析系统整体贷款数据。
2.5.2.2.2.2 参数
参数	参数名称	参数类型	含义和说明
Output	OLB	uint256	尚未偿还的贷款总量（含利息）。
	RA	uint256	已经偿还的金额（含利息）。
	TLD	uint256	总计贷出的金额（含利息）。

2.5.2.2.2.3 执行身份
Public

2.5.2.3 合约事件
2.5.2.3.1 PersonalLoanData
2.5.2.3.1.1 参数
参数	参数名称	参数类型	含义和说明
Event	NCL	uint256	个人已结清贷款笔数。
	TNL	uint256	个人贷款总笔数。
	TLA	uint256	个人贷款总额（含利息）。
	TRA	uint256	个人已还款总额。

2.5.2.3.2 SysLoanData
2.5.2.3.2.1 参数
参数	参数名称	参数类型	含义和说明
Event	OLB	uint256	尚未偿还的贷款总量（含利息）。
	RA	uint256	已经偿还的金额（含利息）。
	TLD	uint256	总计贷出的金额（含利息）。



2.6 风险系数
2.6.1 系数说明
缩写	全称	中文含义	说明
PRF	Personal Risk Factor	个人风险系数	用于评估个人在信用、负债、还款能力等方面的整体风险水平。
SRF	Systemic Risk Factor	系统风险系数	衡量外部宏观经济、行业风险、整体市场波动等对系统级别所造成的潜在影响。
CRF	Comprehensive Risk Factor	综合风险系数	综合了个人（或企业）内部风险及外部环境风险的多维度评估结果所得出的总体风险系数。
产品文档中该名称为"综合风险因子",英文为"Risk Factors"

2.6.1 合约接口设计
2.6.1.1 getPRF
2.6.1.1.1 功能描述
计算并返回个人风险系数（PRF）。
由前端或其他合约调用，实时获取指定用户的风险系数。
2.6.1.1.2 参数
参数	参数名称	参数类型	含义和说明
Output	PRF	uint256	个人风险系数

2.6.1.1.3 执行身份
Public
2.6.1.1.4 逻辑

1. 获取基础数据
从 getPersonalLoanData 获得 个人贷款总额(含利息)(TLA) 与 个人结清的贷款笔数(NCL)、个人贷款总笔数(TNL) 等信息。
利用先前获取的 个人授信额度 (PCL)，或通过 getTATRecord 动态计算得到。
2. 特殊情况
TNL-NCL <= 5  PRF直接等于1 不再计算
3. 贷款占有率 = TLA / PCL
根据贷款占有率所在区间，得到相应"贷款占有率系数"：
范围	贷款占有率系数
[0,85%]	1
(85%,95%] 	0.8
>95%	0.6

4. 正常还款比例 = NCL / TNL
根据正常还款比例所在区间，得到相应"结清贷款比例系数"：
范围	结清贷款比例系数
0	0.2
(0,30%] 	0.4
(30%,60%]	0.5
(60%,80%]	0.8
>80%	1

5. PRF计算
PRF = 贷款占有率系数 * 结清贷款比例系数

2.6.1.2 _calculateSRF
2.6.1.2.1 功能描述
计算并返回系统风险系数（SRF）。
仅在每日清算或特定周期任务执行时，系统内部自动调用，以降低实时计算的性能压力。
2.6.1.2.2 参数
无
2.6.1.2.3 执行身份
内部
2.6.1.2.4 逻辑
1. 获取基础数据
通过 getSysLoanData 获得 OLB（尚未偿还贷款总额，含利息）、RA（已偿还金额，含利息）、TLD（总计贷出金额，含利息）。
从 ERC20 标准合约中查询 TotalSupply（TCash 的当前发行量）。
2. 系统贷出比例 = OLB / TotalSupply
根据比例区间，得到相应"系统贷出比例系数"：

3. 系统总还款率 = RA / TLD
根据还款率区间，得到相应"系统总还款率系数"：

4. SRF 计算
SRF	系统总还款率
	（30%,∞)	(20%,30%]	(10%,20%]	(5%,10%]	[0%,5%]
系统贷出比例	[0,60%）	1	0.9	0.7	0.5	0.3
	[60%,70%)	0.9	0.8	0.7	0.4	0.2
	[70%,80%)	0.8	0.7	0.6	0.3	0.1
	[80%,90%)	0.5	0.4	0.3	0.2	0.1
	[90%,∞)	0.2	0.1	0.1	0.1	0.1

2.6.1.3 getSRF
2.6.1.3.1 功能描述
  查询最新的系统风险系数（SRF）。
  一般在 _calculateSRF 执行完成后，将结果存储到合约状态变量，供此函数对外返回。

2.6.1.3.2 参数
参数	参数名称	参数类型	含义和说明
Output	SPRF	uint256	系统风险系数（SRF）

2.6.1.3.3 执行身份
Public

2.6.1.4 getCRF
2.6.1.4.1 功能描述
计算并返回综合风险系数（CRF），用以评估个人风险与系统风险综合影响下的总体风险水平。

2.6.1.4.2 参数
参数	参数名称	参数类型	含义和说明
Output	CRF	uint256	综合风险系数

2.6.1.4.3 执行身份
Public
2.6.1.4.4 逻辑
1. 先获取或计算 PRF 与 SRF
调用 getPRF() 获得最新个人风险系数。
调用 getSRF() 获得最新系统风险系数。
2. CRF 计算
CRF = PRF * SRF

2.7 贷款功能
2.7.1 功能描述
	TCash 为持有 UNIT 代币（或其他已授权数字资产）的用户提供去中心化贷款服务。用户可通过抵押一定数量的 UNIT，获得与抵押价值相对应的 TCash 贷款额度。
2.7.2 页面说明

2.7.2.1 获取实时价格
2.7.2.1.1 流程

从 Tngateway 获取合约地址与 ABI。
调用 Oracle 合约，查询最新的 wTCash、wUNIT 等价格。
每 30 秒更新一次价格显示，与 Feeder 的价格推送周期保持同步。

2.7.2.1.2 价格获取规则
	Feeder 模块：负责采集并发送价格数据到 Oracle 合约，每 30 秒一次。
	价格来源：ETH 网络上的 wTCash、wUNIT 交易对；若交易所价格获取异常，则使用默认值（1 wUNIT = 10 USD；1 wTCash = 1 USD）。
	前端更新：页面每 30 秒调用 Oracle 接口更新价格展示。

2.7.2.2 页面字段说明
字段	含义	范围	数据来源	说明
credit check	检查		getPersonalLoanData 获取 PCL	PCL == 0 ? failed : passed
Borrow	贷出TCash数量	[0.000,000,001TCash, 最大可贷数量]	用户输入
根据用户输入计算	用户可先行输入此值，由系统计算抵押数。
Collateral	抵押UNIT数量	(0,用户账户余额]	用户输入
根据用户输入计算	用户可先行输入此值，由系统计算可贷数。
TCashPrice	TCash单价	-	从Oracle合约查询获得	这里实际上是wTCash的价格
UnitPrice	UNIT单价		从Oracle合约查询获得	这里实际上是wUnit的价格
ALB	当前登录账户最大可贷TCash数量		getPersonalLoanData 获取 PCL、TLA 计算	产品文档中亦称 Borrowable。
Balance	当前登录账户UNIT余额		使用web3获得原生代币余额取得	
CRF	风险因子		getCRF函数取得	
DailyInteralRate	日利率		从ParameterInfo查询TCASHDIR	

2.7.2.4计算方法
2.7.2.4.1 根据用户输入的UNIT数量计算

其中:
	综合风险系数(CRF)由getCRF 函数获得
	需满足：[0.000000001 TCash, min[贷出TCash，ALB]
2.7.2.4.2 根据用户输入的TCash数量计算

其中:
	综合风险系数(CRF)由getCRF 合约函数获得

2.7.3 合约接口设计
2.7.3.1流程

用户在前端输入抵押数或期望借出数。
前端调用 calculateLoanAmount（若输入抵押数）或对应计算接口（若输入借出数），确定可贷金额或所需抵押量。
用户确认后，调用 loan 函数提交交易。
合约内部更新贷款记录，并更新相关个人和系统级参数。
2.7.3.2 合约函数
2.7.3.2.1 checkMintLock
2.7.3.2.1.1 功能描述
	判断当前是否处于铸造锁定状态
2.7.3.2.1.2 参数
参数	参数名称	参数类型	含义和说明
Output	TCASHMS	uint256	true: 允许 false: 禁止
2.7.3.2.1.2 执行身份
	public

2.7.3.2.2 calculateLoanAmount
2.7.3.2.2.1 功能描述
	用于计算指定用户在抵押一定 UNIT 时，可以借出的 TCash 金额。
2.7.3.2.2.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	address	用户地址
Output	amount	uint256	可贷 TCash 数

2.7.3.2.2.3 执行身份
public
2.7.3.2.2.4 逻辑
从合约中或通过调用 getCRF 获得 综合风险系数(CRF)。
通过 getPersonalLoanData 获取 个人授信额度 (PCL)、个人贷款总额(含利息)(TLA)，计算 ALB = PCL - TLA。
根据 msg.value（抵押的 UNIT 数量）和实时价格（Oracle）计算可贷 TCash： 

需满足：[0.000,000,001, min[TCash Amount，ALB]

2.7.3.2.3 _setRecord

2.7.3.2.3.1 功能描述
用于存储或更新贷款记录，以便后续计算利息及追踪贷款状态。

2.7.3.2.3.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	address	用户地址
	amount	uint256	本次借出的 TCash 数额

2.7.3.2.3.3 执行身份
内部
2.7.3.2.3.4 存储逻辑
参数名称	参数类型	index	含义和说明
loanID	uint256	Y	自增编号，用于唯一识别每笔贷款记录。
account	address		用户地址。
amounts	uint256[]		金额[UNIT,TCASH]
time	uint		block.timestamp，记录发起时间。
interest	uint256		利息金额
IST	uint256		初始为0, 利息结算次数, 每次利息结算+1
status	uint		贷款状态：0=进行中，1=已结清，2=预警中，3=清算中。
注意：需考虑存储性能，尤其是在循环或批量操作时，要合理设计数据结构以减少 Gas 消耗。

2.7.3.2.4 loan

2.7.3.2.4.1 功能描述
	用户发起贷款交易时所调用的主函数，完成实际的借款操作。

2.7.3.2.4.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	address	借款人地址
	amount	uint256	借出的 TCash 数额

2.7.3.2.4.3 执行身份
Public

2.7.3.2.4.4 流程

校验用户抵押数量与可贷额度是否合理。
记录/更新贷款信息（调用 _setRecord 等）。
更新下列信息：
	个人贷款总笔数（TNL）
	个人贷款总额（含利息）（TLA）
	尚未偿还的贷款总量（OLB, 系统级）
	总计贷出的金额（TLD, 系统级）
将相应数量的 TCash 发放给用户地址。

2.7.3.3 合约事件
2.7.3.3.1 LoanRecord
2.7.3.3.1.1 参数
参数	参数名称	参数类型	含义和说明
Event	loanID	uint256	自增编号，用于唯一识别每笔贷款
	account	address	账号
	amounts	uint256[]	金额[UNIT,TCASH]
	prices	uint256[]	价格[UNIT,TCASH]
	CRF	uint256	风险系数
	interest	uint256	利息金额
	IST	uint256	初始为0, 利息结算次数
	status	uint	贷款状态：0=进行中，1=已结清，2=预警，3=清算中

2.7.4 Dataprovider采集设计
2.7.4.1 贷款记录
2.7.4.1.1 数据存储
贷款记录集合(LoanRecords)用于持久化在链上触发的 LoanRecord 事件信息。 
2.7.4.1.2 数据来源
监听合约事件 LoanRecord 并抓取相关参数。
2.7.4.1.3 存储逻辑

2.7.4.1.4 数据对应关系
事件参数名称	存储参数名称	数据处理	说明
loanID	loanID	-	
account	account	toLowerCase	
amounts[0]	UnitAmount 	大数转换 缩小1e18	
amounts[1]	TCashAmount	大数转换 缩小1e18	
prices[0]	UnitPrice	数据转换 缩小1e4	
prices[1]	TCashPrice	数据转换 缩小1e4	
CRF	CRF	数据转换 缩小1e4	
interest	interest	大数转换 缩小1e18	
IST	IST	-	
status	status	-	
			

2.8 还款功能
2.8.1 功能描述
	用户需针对某笔TCash贷款，进行还款，还款成功后会依照还款比例返还质押的UNIT。
2.8.2 页面说明

2.7.2.1 页面字段说明
字段	含义	数据来源	说明
Outstanding	贷还数量	/api/v1.0/loanDetail	data.loan.current.TCashAmount + data.loan.current.insterest
Collateral	抵押数量	/api/v1.0/loanDetail	data.loan.current.UnitAmount
TCash Balanace	TCash 余额	ERC20.balanceOf() 函数获取	当前用户在合约中的 TCash 代币余额
若用户全部还款，还款金额应包括借出的 TCash 本金与累计利息。

2.8.3 合约接口设计

2.8.3.1 合约函数

2.8.3.1.1 getRecord
2.8.3.1.1.1 功能描述
查询指定 loanID 的贷款记录，便于前端或其他合约获取当前贷款的详细状态。
2.8.3.1.1.2 参数
参数	参数名称	参数类型	含义和说明
Input	loanID	uint256	贷款记录的唯一编号
Output	loanID	uint256	自增编号
	account	address	借款人地址
	amounts	uint256[]	金额[UNIT,TCASH]
	time	uint	block.timestamp
	interest	uint256	利息金额
	IST	uint256	利息结算次数, 
	status	uint	0: 贷款进行中
1: 贷款已结清
2: 预警中
3: 清算中

2.8.3.1.1.3 执行身份
Public

2.8.3.1.1 repay
2.8.3.1.1.1 功能描述
	在用户还款时调用的核心函数，按照用户输入的还款金额对对应贷款进行部分或全部偿还，并根据还款比例或结清情况释放抵押物。
2.8.3.1.1.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	address	借款人地址
	loanID	uint256	贷款记录编号
	amount	uint256	用户本次还款的 TCash 数额

2.8.3.1.1.3 执行身份
Public
2.8.3.2.1.4 流程

1. 校验
确认 loanID 状态是否允许还款（如状态为已结清或清算中则不可还款）。
确认用户还款金额 amount 合理，且用户余额足够。
2. 更新数据
贷款记录 (record)：更新 amounts、interest、status 等字段。
更新记录时需要注意, 如果是部分还款, 则优先偿还利息部分。
个人结清的贷款笔数 (NCL)：若本次还款后贷款完全结清，将该笔数 +1。
个人贷款总额（含利息）(TLA)：更新总额（含利息）的减少值。
个人还款总额 (TRA)：增加本次还款数额。
尚未偿还的贷款总量 (OLB, 系统含利息)：减少对应数值。
已经偿还的金额 (RA, 系统含利息)：增加本次还款数额。
总计贷出的金额 (TLD, 系统含利息)：更新总额
3. 释放抵押物
若本次还款后贷款部分偿还，则按比例释放 UNIT。
若全部结清，则释放所有剩余抵押 UNIT 并更新状态为"已结清"。
4. 触发事件
通过 RepayRecord 事件，记录还款金额、释放抵押数量、时间戳等。

2.8.3.2 合约事件
2.8.3.2.1 RepayRecord
2.8.3.2.1.1 参数
参数	参数名称	参数类型	含义和说明
Event	loanID	uint256	自增编号，用于唯一识别每笔贷款
	account	address	借款人地址
	TCashAmount	uint256	用户本次偿还的 TCash 数量
	UnitAmount	uint256	因还款而释放的 UNIT 数量（可为 0 或全部）


2.8.4 Dataprovider采集设计
2.8.4.1 还款记录
2.8.4.1.1 数据存储
	还款记录通常存储于 RepayRecords 集合中，用于统计和分析。
2.8.4.1.2 数据来源
	来自合约事件 RepayRecord。
2.8.4.1.3 数据对应关系
事件参数名称	存储参数名称	数据处理	说明
loanID	loanID	--	唯一识别每笔贷款
account	account	toLowerCase	
TCashAmount	TCashAmount	大数转换 缩小1e18	还款金额（TCash）
UnitAmount	UnitAmount	大数转换 缩小1e18	解质押 UNIT 数量


2.9 增加贷款抵押品
2.9.1 功能描述
	当借款人因风控评估或行情波动导致现有质押率不足时，可额外抵押更多资产（如 UNIT）以提高质押率。"增加贷款抵押品"功能允许用户在当前贷款的基础上追加抵押物，确保其质押率满足或高于预警线，避免进一步的风险操作（如清算）。
2.9.2 页面说明

2.9.2.1 页面字段说明
字段	含义	数据来源	说明
Outstanding	贷还数量	/api/v1.0/loanDetail	data.loan.current.TCashAmount + data.loan.current.insterest
Collatoral	抵押数量	/api/v1.0/loanDetail	data.loan.current.UnitAmount
TCash Price	TCash 价格	从Oracle合约查询获得	这里实际上是wTCash的价格
Unit Price	Unit 价格	从Oracle合约查询获得	这里实际上是wUnit的价格
TCash Value	TCash 价值	计算	Outstanding * TCash Price
Unit Value	Unit 价值	计算	Collatoral * Unit Price
Collatoral Rate	质押率	/api/v1.0/loanDetail	data.loan.current.UnitAmount * data.loan.current.UnitPrice / ( (data.loan.current.interest+ data.loan.current.TCashAmount) * data.loan.current.TCashPrice)
Early warning threshold	预警线	从parameterInfo查询TCASHMCT	

2.9.2 合约接口设计

2.9.2.1 合约函数

2.9.2.1.1 collateralTopUp
2.9.2.1.1.1 功能描述
	当用户需要在现有贷款（loanID）基础上新增抵押物时，调用该函数提交交易。合约会将额外抵押物记录到对应贷款，并更新质押率或风险状态。
2.9.2.1.1.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	address	用户地址
	loanID	uint256	目标贷款的唯一编号

2.9.2.1.1.3 执行身份
Public
2.9.2.1.1.4 流程

1. 校验
确认 loanID 状态允许追加抵押（如未清算）。
校验用户传入或转入的抵押物数量 msg.value。
2. 更新贷款信息
调整对应贷款记录中UNIT 抵押数量。
3. 事件触发
触发 CollateralTopUpRecord 事件，供链下数据采集。


2.9.2.2 合约事件
2.9.2.2.1 CollateralTopUpRecord
2.9.2.2.1.1 参数
参数	参数名称	参数类型	含义和说明
Event	loanID	uint256	自增编号，用于唯一识别每笔贷款
	account	address	用户账户地址
	amount	uint256	本次新增抵押物数量（如 UNIT）

2.9.3 Dataprovider采集设计
2.9.3.1 增加贷款抵押品记录
2.9.3.1.1 数据存储
还款记录通常存储于 CollateralTopUpRecords 集合中，用于统计和分析。
2.9.3.1.2 数据来源
监听并解析合约事件 CollateralTopUpRecord。
2.9.3.1.3 数据对应关系
事件参数名称	存储参数名称	数据处理	说明
loanID	loanID	--	贷款编号
account	account	toLowerCase	
amount	amount	大数转换 缩小1e18	实际增加的抵押物数量


2.10 记录查看功能
2.10.1 页面说明
2.10.1.1 贷款记录

2.10.1.1.1 页面字段说明
字段	含义	数据来源	说明
No.	贷款编号	/api/v1.0/loanlist	result.loanID
Date	贷款日期	/api/v1.0/loanlist	result.date
Loan TCash	贷出TCash数量	/api/v1.0/loanlist	result.TCashAmount
Collateral	抵押UNIT数量	/api/v1.0/loanlist	result.UnitAmount
Unrepaid	待还款总额	/api/v1.0/loanlist	result.TcashAmount + result.Interest
Repayment Status	还款状态	/api/v1.0/loanlist	result.status：0=进行中，1=已结清，2=预警中，3=清算中。
wstatus	预警状态	/api/v1.0/loanlist	result.status == 2?true:false
cstatus	清算状态	/api/v1.0/loanlist	result.status == 3?true:false

2.10.1.2 贷款详情页面


2.10.1.2.1 页面字段说明
2.10.1.2.1.1 表头
字段	含义	数据来源	说明
loanID	贷款编号	/api/v1.0/loanDetail	data.loan.original.loanID
Borrow Time	贷款日期	/api/v1.0/loanDetail	data.loan.original.date
Repayment Status	还款状态	/api/v1.0/loanDetail	data.loan.current.status
2.10.1.2.1.2 Initial Data
字段	含义	数据来源	说明
Collateral	质押数量	/api/v1.0/loanDetail	data.loan.original.UnitAmount
UNIT Price	UNIT单价	/api/v1.0/loanDetail	data.loan.original.UnitPrice
UNIT Value	UNIT 价值	/api/v1.0/loanDetail	data.loan.original.UnitAmount * data.loan.original.UnitPrice
Borrow	TCash 数量	/api/v1.0/loanDetail	data.loan.original.TCashAmount
TCash Price	TCash 单价	/api/v1.0/loanDetail	data.loan.original.TCashPrice
TCash Value	TCash 价值	/api/v1.0/loanDetail	data.loan.original.TCashAmount * data.loan.original.TCashPrice
Risk Factors	CRF	/api/v1.0/loanDetail	data.loan.original.CRF
Collateral Ratio	质押率	/api/v1.0/loanDetail 	(data.loan.original.UnitAmount* data.loan.original.UnitPrice)/ (data.loan.original.TCashAmount* data.loan.original.TCashPrice)
Interest Rate	贷款日利率 TCASHDIR	ParameterInfo合约查询TCASHDIR	
2.10.1.2.1.3 Current Data
字段	含义	数据来源	说明
Collateral	质押数量	/api/v1.0/loanDetail	data.loan.current.UnitAmount
UNIT Value	UNIT 价值	/api/v1.0/loanDetail	data.loan.current.UnitAmount * data.loan.current.UnitPrice
Outstanding	待还数量	/api/v1.0/loanDetail	data.loan.current.TCashAmount + data.loan.current.insterest
Outstanding Value	贷还价值	/api/v1.0/loanDetail	(data.loan.current.TCashAmount + data.loan.current.insterest) * data.loan.current.TCashPrice
Borrow	借款数量	/api/v1.0/loanDetail	data.loan.current.TCashAmount
Interest	利息	/api/v1.0/loanDetail	data.loan.current.insterest
Current Risk Factors	CRF	/api/v1.0/loanDetail	data.loan.current.CRF
Current Collateral Ratio	当前质押比	/api/v1.0/loanDetail	data.loan.current.UnitAmount * data.loan.current.UnitPrice / ( (data.loan.current.interest+ data.loan.current.TCashAmount) * data.loan.current.TCashPrice)
2.10.1.2.1.4 Collateral Change Record
字段	含义	数据来源	说明
时间	时间	/api/v1.0/loanDetail	data.collateralChangeRecord.date
事件	事件	/api/v1.0/loanDetail	data.collateralChangeRecord.event
0:借出TCash,1:还款成功返还UNIT 2.增加抵押物
UNIT变更数量	UNIT变更数量	/api/v1.0/loanDetail	data.collateralChangeRecord.change
抵押物数量	抵押物数量	/api/v1.0/loanDetail	data.collateralChangeRecord.amount
抵押物单价	抵押物单价	/api/v1.0/loanDetail	data.collateralChangeRecord.price
抵押物价值	抵押物价值	/api/v1.0/loanDetail	data.collateralChangeRecord.amount * data.collateralChangeRecord.price
Original collateral rate	增加前质押率	/api/v1.0/loanDetail	data.collateralChangeRecord.LTV[0]
Modified collateral rate	增加后质押率	/api/v1.0/loanDetail	data.collateralChangeRecord.LTV[1]
2.10.1.2.1.5 Repayment Record
字段	含义	数据来源	说明
Time	时间	/api/v1.0/loanDetail	data.repay.date
事件	事件	固定值 "还款 Repay"	
TCash数量	TCash数量	/api/v1.0/loanDetail	data.repay.TCashAmount
Collateral Released	返还UNIT数量	/api/v1.0/loanDetail	data.repay.UnitAmount
2.10.1.2.1.6 Interest Record
字段	含义	数据来源	说明
时间Time	时间	/api/v1.0/interestlist	data.date
Interest	利息	/api/v1.0/interesrlist	data.interest

2.10.1.3 还款记录页面

2.10.1.3.1 页面字段说明
字段	含义	数据来源	说明
Repayment Time	还款时间	/api/v1.0/repaylist	data.date
Borrow No.	贷款编号	/api/v1.0/repaylist	data.loanID
Repayment Amount	还款TCash数量	/api/v1.0/repaylist	data.TCashAmount
Collateral Return Amount	返还UNIT数量	/api/v1.0/repaylist	data.UnitAmount

2.10.1.4 个人中心页面
	个人中心页面为用户提供当前贷款的总体概览，并通过图表直观展示贷款状态与还款情况。

2.10.1.4.1 页面字段说明
2.10.1.4.1.1 My Loan
字段	含义	数据来源	说明
Max borrowable amount	个人授信额度(PCL)	从TCash.getPersonalLoanData中获得PCL	
Remaining borrowable amount	个人可贷余额(ALB)	从TCash.getPersonalLoanData中获得ALB	
Outstaning TCash	个人贷款总额(含利息)(TLA)	从TCash.getPersonalLoanData中获得TLA	
2.10.1.4.1.2 图表1
字段	含义	数据来源	说明
Normal	正常的贷款记录数量	/api/v1.0/loadstatistic	data["0"]+data["1"]
(0=进行中, 1=已结清)
Warning	处于预警状态的记录数量	/api/v1.0/loadstatistic	data["2"]
Liquldated	处于清算状态的记录数量	/api/v1.0/loadstatistic	data["3"]
合计			data.totalLoan

2.10.1.4.1.2 图表2
字段	含义	数据来源	说明
Unpaid	个人贷款总额(含利息)(TLA)	从TCash.getPersonalLoanData中获得TLA	
Repaid	个人还款总额(TRA)	从TCash.getPersonalLoanData中获得TRA	
合计		TLA + TRA	

2.10.2 API接口设计
	以下接口均位于前端网关 /api/v1.0/ 下，用于前端与后端进行数据交互。
2.10.2.1 GET /api/v1.0/loanlist
2.10.2.1.1 接口说明
	获取贷款记录列表，并进行分页。
2.10.2.1.2 处理逻辑
	对输入参数进行必要校验后，转发至 TN-gateway 的 /api/v1.0/tcash/loan 进行数据查询。
2.10.2.1.3 返回值
{
  code: 0,
  data: {
    page: 1,
    pageSize: 20,
    total: 1,
    list: [
      {
        loanID: 1,
        TCashAmount:100.1,
        TCashPrice:10,
        UnitAmount:10.9,
        UnitPrice:10,
        CRF:1,
        intersest:0,
        IST:0,
        date:'2023-05-22T07:09:02.000Z',
        status:0,
        original:0
      }
    ]
  }
}

2.10.2.2 GET /api/v1.0/loanDetail
2.10.2.2.1 接口说明
	查询指定 loanID 的贷款详情，包含原始数据、当前数据、抵押变更记录、还款记录等。
2.10.2.2.2 处理逻辑
  调用多个 TN-gateway 接口：
	/api/v1.0/tcash/repay（还款记录）
	/api/v1.0/tcash/loan/:loanID（贷款记录）
	/api/v1.0/tcash/collateraltopup（追加抵押记录）
  将返回数据按时间顺序整合到 data.collateralChangeRecord。

2.10.2.2.3 与TNgateway的数值关系
接口字段	tngateway URL	tngateway 数据字段	说明
data.loan	/api/v1.0/tcash/loan/:loanID	data	
data.collateralChangeRecord	A: /api/v1.0/tcash/repay
B: /api/v1.0/tcash/loan/:loanID
C: /api/v1.0/tcash/collateraltopup	A.data
B.data
C.data	数据遍历后聚合取到的数据
data.repay	/api/v1.0/tcash/repay	data	
2.10.2.2.4 返回值
{
  code:0,
  data:{
    loan:{
      original: {
        loanID: 1,
        TCashAmount: 100.1,
        TCashPrice: 10,
        UnitAmount: 10.9,
        UnitPrice: 10,
        CRF: 1,
        intersest: 0,
        IST:0,
        date: '2023-05-22T07:09:02.000Z',
        status: 0,
      },
      current: {
        loanID: 1,
        TCashAmount: 100.1,
        TCashPrice: 10,
        UnitAmount: 10.9,
        UnitPrice: 10,
        CRF: 1,
        intersest: 0,
        IST:0,
        date: '2023-05-22T07:09:02.000Z',
        status: 0,
      }
    },
    collateralChangeRecord:[
      {
        amount:150,
        change:150,
        price:10,
        LTV:[0,1.5],
        event:0, //0:借出TCash,1:还款成功返还UNIT 2.增加抵押物
        date: '2023-05-23T07:09:02.000Z',
      },
      {
        amount:180,
        change:30,
        price:10,
        LTV:[1.3,1.3],
        event:2, //0:借出TCash,1:还款成功返还UNIT 2.增加抵押物
        date: '2023-05-23T07:09:02.000Z',
      },
      {
        amount:170,
        change:-10,
        price:0,
        LTV:[0,0],
        event:1, //0:借出TCash,1:还款成功返还UNIT 2.增加抵押物
        date: '2023-05-23T07:09:02.000Z',
      }
    ]
  },
  repay:[
    {
      loanID:1,
      TCashAmount:3,
      UnitAmount:1,
      date: '2023-05-23T07:09:02.000Z',
    },
    {
      loanID:1,
      TCashAmount:2,
      UnitAmount:0.6,
      date: '2023-05-23T07:09:02.000Z',
    },
  ]
}
2.10.2.3 GET /api/v1.0/interestlist
2.10.2.3.1 接口说明
	查询指定用户和（可选）loanID 的利息记录。
2.10.2.3.2 处理逻辑
	对输入参数进行必要校验后，转发至 TN-gateway 的 /api/v1.0/tcash/interest 进行数据查询。
2.10.2.3.3 返回值
{
  code: 0,
  data: [
    {
      loanID: 1,
      interest: 10,
      date: '2023-05-22T07:09:02.000Z',
    },
    {
      loanID: 1,
      interest: 10,
      date: '2023-05-23T07:09:02.000Z',
    }
  ]
}



2.10.2.4 GET /api/v1.0/repaylist
2.10.2.4.1 接口说明
	查询指定用户（可选 loanID）的还款记录。
2.10.2.4.2 处理逻辑
	对输入参数进行必要校验后，转发至 TN-gateway 的 /api/v1.0/tcash/repay 进行数据查询。
2.10.2.4.3 返回值
{
  code:0,
  data:[
    {
      loanID:1,
      TCashAmount:3,
      UnitAmount:1,
      date: '2023-05-23T07:09:02.000Z',
    },
    {
      loanID:1,
      TCashAmount:2,
      UnitAmount:0.6,
      date: '2023-05-23T07:09:02.000Z',
    },
  ]
}

2.10.2.5 GET /api/1.0/loanstatistic
2.10.2.5.1 接口说明
用于返回当前用户的贷款统计信息，以便在个人中心页面生成统计图表

2.10.2.5.2 处理逻辑
  1. 通过调用 TN-gateway 的 /api/v1.0/tcash/loan 获取该用户的全部贷款数据列表。
  2. 遍历所有记录，根据其 status 字段进行分类统计，计算各状态的贷款数量以及总贷款数。
  3. 返回统计结果给前端，用于可视化展示。
2.10.2.5.3 返回值
{
  code:0,
  data:{
    totalLoan:13,
    "0":6,
    "1":4,
    "2":2,
    "3":1
  }
}

totalLoan 表示该用户所有贷款的总笔数；
"0", "1", "2", "3" 分别表示不同贷款状态（0=进行中、1=已结清、2=预警中、3=清算中）的笔数统计；

2.10.3 TN-gateway接口设计
2.10.3.1 GET /api/v1.0/tcash/loan
2.10.3.1.1 接口说明
	获取符合条件的贷款记录列表，可按状态、时间范围等多维度过滤。
2.10.3.1.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	String	(required) 当前用户的account
	loanID	String	(opt.)根据loanID过滤结果
	status	Number	(opt.)根据状态过滤结果
	page	Number	(opt.)页码 默认为1
	pageSize	Number	(opt.)每页数据条数 默认为20
	dateFrom	Date	(opt.)起始时间
	dateTo	Date	(opt.)结束时间
	sort	String	(opt.)排序字段 默认为时间倒序
2.10.3.1.3 返回值
{
  code: 0,
  data: {
    page: 1,
    pageSize: 20,
    total: 1,
    list: [
      {
        loanID: 1,
        TCashAmount:100.1,
        TCashPrice:10,
        UnitAmount:10.9,
        UnitPrice:10,
        CRF:1,
        intersest:0,
        IST:0,
        date:'2023-05-22T07:09:02.000Z',
        status:0,
        original:0
      }
    ]
  }
}

2.10.3.1.4 查询集合
LoanRecords
2.10.3.1.5 接口逻辑
	需处理可能存在的同一 loanID 下多条记录（original = true / false），取最新记录作为列表显示。

2.10.3.2 GET /api/v1.0/tcash/loan/:loanID
2.10.3.2.1 接口说明

2.10.3.2.2 参数
参数	参数名称	参数类型	含义和说明
Input	loanID	String	(required) 贷款编号

2.10.3.2.3 返回值
{
  code:0,
  data:{
    original:{
      loanID: 1,
      TCashAmount:100.1,
      TCashPrice:10,
      UnitAmount:10.9,
      UnitPrice:10,
      CRF:1,
      intersest:0,
      IST:0,
      date:'2023-05-22T07:09:02.000Z',
      status:0,
    },
    current:{
      loanID: 1,
      TCashAmount:100.1,
      TCashPrice:10,
      UnitAmount:10.9,
      UnitPrice:10,
      CRF:1,
      intersest:0,
      IST:0,
      date:'2023-05-22T07:09:02.000Z',
      status:0,
    }
  }
}

2.10.3.2.4 查询集合
LoanRecords
2.10.3.2.4 接口逻辑
	该接口会同时返回 original 为 true 和 false 的两条记录，其中 original 等于 true 的记录处于 data.original 中，而 original 等于 false 的记录则在 data.current 里。当不存在 original 为 false 的记录时，data.current 和 data.original 是一致的。

2.10.3.3 GET /api/v1.0/tcash/loan/interests
2.10.3.3.1 接口说明
	查询利息明细，支持按用户或 loanID 过滤。
2.10.3.3.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	String	(required)用户账号
	loanID	String	(opt.) 贷款编号

2.10.3.3.3 返回值
{
  code: 0,
  data: [
    {
      loanID: 1,
      interest: 10,
      date: '2023-05-22T07:09:02.000Z',
    },
    {
      loanID: 1,
      interest: 10,
      date: '2023-05-23T07:09:02.000Z',
    }
  ]
}

2.10.3.3.4 查询集合
InterestRecords

2.10.3.4 GET /api/v1.0/tcash/loan/repay
2.10.3.4.1 接口说明
	查询还款明细，支持按用户或 loanID 过滤。
2.10.3.4.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	String	(required) 用户账号
	loanID	String	(opt.) 贷款编号

2.10.3.4.3 返回值
{
  code:0,
  data:[
    {
      loanID:1,
      TCashAmount:3,
      UnitAmount:1,
      date: '2023-05-23T07:09:02.000Z',
    },
    {
      loanID:1,
      TCashAmount:2,
      UnitAmount:0.6,
      date: '2023-05-23T07:09:02.000Z',
    },
  ]
}

2.10.3.4.4 查询集合
RepayRecords

2.10.3.5 GET /api/v1.0/tcash/loan/collateraltopup
2.10.3.5.1 接口说明
	查询追加抵押操作记录，支持按用户或 loanID 过滤。
2.10.3.5.2 参数
参数	参数名称	参数类型	含义和说明
Input	account	String	(required) 用户账户
	loanID	String	(opt.) 贷款编号

2.10.3.5.3 返回值
{
  code:0,
  data:[
    {
      loanID:1,
      amount:3,
      price:10,
      LTV:0.5,
      date: '2023-05-23T07:09:02.000Z',
    },
    {
      loanID:1,
      amount:2,
      price:10,
      LTV:0.5,
      date: '2023-05-23T07:09:02.000Z',
    },
  ]
}

2.10.3.5.4 查询集合
CollateralTopUpRecords

2.11 清算
	每日 UTC 0 点，FoundationManager 通过 FoundationManagerTools 定时调用智能合约，对尚未结清的贷款进行利息计算、预警与清算检查，该过程称为"清算"。
2.11.1 合约接口设计
2.11.1.1 流程

1. 定时任务触发
FoundationManagerTools 在指定时间（每日 UTC 0 点）批量查询处于活动状态 (status == 0) 的贷款记录。
2. 逐笔处理
对每笔符合条件的贷款，调用合约中专门的函数计算当日利息，并判断是否进入预警或清算状态。

2.11.1.2 合约函数
2.11.1.2.1 interestCalculation
2.11.1.2.1.1 功能描述
	由 FoundationManagerTools 定时触发，用于对指定 loanID 的贷款记录计算当日利息，并根据抵押率判断是否进入预警或清算状态。
2.11.1.2.1.2 参数
参数	参数名称	参数类型	含义和说明
Input	loanID	uint256	贷款记录唯一编号

2.11.1.2.1.3 执行身份
FOUNDATION_MANAGER
2.11.1.2.1.4 流程

1. 获取并校验记录
从合约或数据库中获取 loanID 对应的贷款记录 (status == 0)。
2. 计算利息 
   interest=record.TCashAmount×TCASHDIR
   其中 TCASHDIR 为日利率 (从 ParameterInfo 合约获取)。
3. 更新数值
贷款记录 (record)
个人贷款总额（含利息）(TLA)
系统尚未偿还的贷款总量 (OLB)
系统总计贷出金额 (TLD)
4. 判断预警 

若满足，则将记录状态置为 2（预警中）。
5. 判断清算 

若满足，则将记录状态置为 3（清算中）。
6. 判断还款周期
IST > TCASHRC
若满足，则将记录状态置为 3（清算中）。

2.11.1.2.1.5 业务逻辑
  仅对 status == 0（进行中）的贷款执行利息计算。
  若贷款状态已处于预警（2）或清算（3），可根据业务需求选择是否在本流程中再次更新或维持原状态。
  需在合约内或链下数据库中做好更新与事件触发，以便Dataprovider 同步数据。
2.11.1.3 合约事件
2.11.1.3.1 InterestRecord
2.11.1.3.1.1 参数
参数	参数名称	参数类型	含义和说明
Event	loanID	uint256	自增编号
	account	account	用户账户地址
	interest	uint256	利息金额

2.11.2 Dataprovider采集设计
2.11.2.1 还款记录
2.11.2.1.1 数据存储
	利息记录通常存储在 InterestRecords 集合中，每条记录对应一次利息计算事件。 
2.11.2.1.2 数据来源
	监听合约事件 InterestRecord，获取 loanID、account、interest 等参数。
2.11.2.1.3 数据对应关系
事件参数名称	存储参数名称	数据处理	说明
loanID	loanID	--	贷款编号
account	account	toLowerCase	
interest	interest	大数转换 缩小1e18	记录利息金额



3. 数据库设计
3.1.1 数据库类型
	本项目的中心化跨链模块采用非关系型数据库 Mongo 作为后端数据库。其中，开发环境使用通过 Docker 部署的本地 Mongo 数据库，测试网和主网则统一使用托管在 Mongo Atlas 上的数据库服务。
3.2 集合结构设计
3.2.1 贷款记录集合(LoanRecords)
3.2.1.1 集合结构
字段名称	类型	index	unique	required	默认值	描述
loanID	Number	Y		Y		唯一标识 序列
account	String	Y		Y		账号
TCashAmount	Number			Y		TCash数量
TCashPrice	Number			Y		TCash价格
UnitAmount	Number			Y		Unit数量
UnitPrice	Number			Y		Unit 价格
CRF	Number			Y		CRF
interest	Number			Y	0	利息总额
IST	Number			Y	0	利息结算次数
date	Date				Date.now()	
status	Number			Y	0	0: 活动的贷款
1: 结清的贷款
2: 预警
3. 清算
origianl	Boolean	Y		Y	true	标记是否为初始记录
3.2.1.2 集合数据来源
Dataprovider 采集事件 LoanRecord 获得

3.2.2 贷款利息记录集合(InterestRecords)
3.2.1.1 集合结构
字段名称	类型	index	unique	required	默认值	描述
loanID	Number	Y	Y	Y		唯一标识 与LoanRecords集合关联
interest	String				0	利息金额
date	Date				Date.now()	

3.2.1.2 集合数据来源
Dataprovider 采集事件 InterestRecord 获得

3.2.3 还款记录集合(RepayRecords)
3.2.3.1 集合结构
字段名称	类型	index	unique	required	默认值	描述
loanID	Number	Y	Y	Y		唯一标识 与LoanRecords集合关联
TCashAmount	String				0	还款金额
UnitAmount	String				0	解质押金额
date	Date				Date.now()	

3.2.3.2 集合数据来源
Dataprovider 采集事件 RepayRecord获得

3.2.4 增加贷款抵押品记录集合(CollateralTopUpRecords)
3.2.4.1 集合结构
字段名称	类型	index	unique	required	默认值	描述
loanID	Number	Y	Y	Y		唯一标识 与LoanRecords集合关联
amount	String			Y	0	增加抵押品记录集合
price	Number			Y		UNIT 价格
LTV	Number			Y		质押率
date	Date				Date.now()	

3.2.4.2 集合数据来源
Dataprovider 采集事件 CollateralTopUpRecord获得

4. 用户界面设计
等待UI提供







5. 安全与稳定
	本章主要介绍在TCash项目的开发与运维过程中, 为确保系统安全和稳定所采取的措施, 包括自动化测试、依赖漏洞检测以及持续集成与持续交付的工作流程。
5.1 snyk与npm audit
	随着项目的不断迭代与引入第三方库，系统所依赖的包可能会存在安全漏洞或版本兼容风险。
	利用依赖安全检测工具（如 Snyk 和 npm audit），可定期扫描所有项目依赖，及时发现并修复安全漏洞，降低潜在风险。

5.2 Github workflow
5.3.1 工作流程概述
1. 持续集成/持续交付（CI/CD）
通过 GitHub Actions（或其他 CI/CD 平台）自动化执行代码质量检查、单元测试、依赖扫描、安全测试、构建与部署等流程。
确保每次代码变更都能在最短时间内发现潜在问题，提升交付效率与质量。
5.3.2 关键步骤
1. 代码拉取与依赖安装
检出最新代码后，安装项目所需依赖（npm install 或 yarn install）。
2. 安全与质量扫描
执行 ESLint/Prettier 等静态代码分析工具，确保代码规范与质量。
调用 Snyk / npm audit 检查依赖漏洞。
3. 单元测试与集成测试
运行 Jest、Mocha 等测试框架，保证主要业务逻辑的正确性。
若存在跨链模拟环境，可进行简单的集成测试，验证私有链与 Sepolia 的交互正确性。
4. 构建与部署
若所有测试与扫描均通过，则进行构建（Webpack 等），并部署到指定环境（Dev、Test、Prod）。
部署后可执行进一步的冒烟测试或自动化测试，确认系统在目标环境中运行正常。




第四部分 技术要求
1. 代码要求
	在项目开发与维护过程中，所有源代码应使用英文规范注释，并遵循蔷薇聚信前端规约（eslint-config-trustlink）来统一代码格式和风格；在提交代码时，借助 Husky 对提交流程进行检查（包括但不限于 ESLint），并结合 Snyk 对依赖库中的严重安全漏洞进行有选择的排除；此外，为确保接口文档的完整与可维护性，项目将使用 Swagger 来提供 API 接口文档。


第五部分 附录
1. 单位转换参考函数
	fromAtto 用于处理把aUnit转换为Unit以及aTCash转换为TCash; 反过来使用toAtto函数.
const fromAtto = (attoNum, decimals = 18,displayDecimals=4)=>{
  const base = 10n ** BigInt(decimals);

  // 整数部分
  const intPart = attoNum / base;
  // 余数部分
  const fracPart = attoNum % base;

  // 将余数部分转为长度=decimals的字符串, 左侧补0
  let fracStr = fracPart.toString().padStart(decimals, '0');

  // 如果只想显示整数（displayDecimals = 0）
  if (displayDecimals === 0) {
    // 看看第 1 位小数（即 fracStr[0]）是否 >= '5' 来决定要不要进位
    if (decimals > 0 && fracStr[0] >= '5') {
      return (intPart + 1n).toString(); // 四舍五入进位
    } else {
      return intPart.toString();
    }
  }

  // 如果指定的显示位数 < 原始 decimals，则需要四舍五入
  if (displayDecimals < decimals) {
    // roundingDigit 用来决定是否进位
    const roundingDigit = fracStr[displayDecimals];

    // 先取出要保留的部分
    let keepStr = fracStr.slice(0, displayDecimals);

    if (roundingDigit >= '5') {
      // 需要进位
      let keepVal = BigInt(keepStr);
      keepVal += 1n; // 加1

      // 如果加完之后等于 10^displayDecimals，说明要对整数部分进位
      if (keepVal === 10n ** BigInt(displayDecimals)) {
        return (intPart + 1n).toString()
          + (displayDecimals > 0 ? '.' + '0'.repeat(displayDecimals) : '');
      } else {
        // 正常情况，重新补齐保留的小数位
        const newFracStr = keepVal.toString().padStart(displayDecimals, '0');
        return intPart.toString() + '.' + newFracStr;
      }
    } else {
      // 不需要进位，直接返回
      return intPart.toString() + '.' + keepStr;
    }
  }

  return intPart.toString() + '.' + fracStr;
}

function toAtto(ethStr, decimals = 18) {
  // 分割小数点
  let [intPart, fracPart = ''] = ethStr.split('.');
  // 确保小数部分不会超过 decimals，如果不足则右侧补0
  if (fracPart.length > decimals) {
    // 超过 decimals，可以选择截断或报错，这里简单截断
    fracPart = fracPart.slice(0, decimals);
  }
  fracPart = fracPart.padEnd(decimals, '0');

  // 最终组合成一个字符串，再转 BigInt
  const combinedStr = intPart + fracPart;
  return BigInt(combinedStr);
}

// 测试
const attoValue = toAtto("1.23");
console.log(attoValue.toString()); // "1230000000000000000"

// 使用示例
const value = fromAtto(123456789012345678901234567890n);
console.log(value);  // 123456789012.3457
