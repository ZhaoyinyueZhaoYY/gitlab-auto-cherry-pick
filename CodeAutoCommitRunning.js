/*
    ---23.08.17---
    1、点击合并的时候校验每个分支数量够不够，够的跳过并显示成功，将每个commit状态设置为success,不够的取localStorage，跳过'success'和'cherry-picked'的commit,其他的重新执行
    2、不够的进行合并，记录状态，状态分为：success、failure、conflict,非success记录msg，记入localStrorage
    3、添加检查按钮，校验每个分支数量够不够，够的跳过并显示成功，将每个commit状态设置为success，所有都成功后设置隐藏控件值，
       可以点发送按钮。分支缺少commit时提示数量需要用户去确认

    ---23.08.21---
    1、merge requests 时设置remove_source_branch为true，在合并成功后删除临时分支
    2、在cherry-pick失败的时候删除临时分支

    ---23.09.08---
    1、cherry-picker部分逻辑重写，现在单版本单工程只会创建一个临时分支，所有commit通过cherry-pick到临时分支，再合并到目标分支
    2、添加多工程错误处理展示
    3、添加创建分支错误处理展示
    4、优化合并按钮disabled逻辑
    5、localStorage存储数据仅作为Bug排查

    ---23.12.10---
    1、切换cdn源到知乎源
*/ 
(function () {
    function gitAutoMQ() {
        var metaData = csdk.core.getMetaData(); //获取metaData
        return {
            type: 'raw',
            plugin: {
                install: function () {
                },
                requiredAssert: function (data) {
                    if (data.isNotNull == 1 && data.value == '') return false;
                    return true;
                }
            },
            implement: {
                config: {
                    headers: {
                        'Content-Type': 'application/json',
                        'Private-Token': ''
                    },
                },
                mergeProcess:null,
                mergeTitle:'',
                theKeyBranch:'',
                codeAutoCommitId:'',
                tokenExpired:false,
                allBranch:[],
                targetBranch:[],
                targetCommits:[],
                init: function (context, container) {
                    var ctx = this;

                    var ctrlTitleStyle = ctx.$data.ctrlTitleStyle;//是否显示标题
                    var result = '';
                    switch (ctrlTitleStyle) {
                        case 'linewrap':
                            result = 'is-two';
                            break;
                        case 'inline':
                            result = 'is-one';
                            break;
                        case 'none':
                            result = 'is-none';
                            break;
                        default:
                            break;
                    }
                    var el = document.createElement('section');
                    var showValue = ctx.$data.showValue;
                    //此处HTML �?要根据需求自行组�? todo
                    // todo 隐藏 ctx.$data.auth === 'browse'  ctx.$data.auth === 'hide'
                    // todo 编辑 ctx.$data.auth === 'edit'
                    // todo 穿�?? ctx.$data.relationData && ctx.$data.relationData.imgShow === '1'

                    var showHTML = '';
                    showHTML += '<section class="cap4-text ' + result + '">';
                    showHTML += '<link href="https://cdn.bootcdn.net/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.css" rel="stylesheet" />';
                    showHTML += '<div class="cap4-text__right field-content-wrapper is-relation">';
                    showHTML += '<div class="cap4-text__cnt field-content" >'
                    showHTML += '<input type="text" id="gitInput" class="is-relatinbrowse" placeholder="请输入gitlab账户绑定的AccessToken" ' + this.$data.id + '" value="' + showValue + '">'
                    showHTML += '<button style="width: 40px;line-height: 28px;" id="gitButton">合并</button>'
                    showHTML += ' </div>'
                    showHTML += '</div>';
                    showHTML += '</section>';
                    el.innerHTML = showHTML;
                    var script = document.createElement('script');
                    script.src = 'https://unpkg.zhimg.com/axios/dist/axios.min.js';
                    el.appendChild(script);
                    var script1 = document.createElement('script');
                    script1.src = 'https://cdn.bootcdn.net/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.js';
                    el.appendChild(script1);
                    container.innerHTML = '';
                    container.appendChild(el);
                    setTimeout(function () {
                        var privateToken = localStorage.getItem('Private-Token');
                        if (privateToken) {
                            document.querySelector('#gitInput').value = privateToken;
                        }
                        if (csdk && csdk.core && csdk.core.relayout)
                            csdk.core.relayout();
                    }, 0);
                    ctx.$el = el;
                    var btnEL = el.querySelector('#gitButton');
                    // 绑定事件
                    ctx.$on(btnEL, 'click', function (event) {
                        ctx.handle();
                    });

                    this.codeAutoCommitId='CodeAutoCommit'+this.parseQuery(window.location.search)?.affairId

                    // 获取表单数据
                    const { formmains, formsons, metadata } = window.csdk.core.getFormData();
                    let records=formsons.front_formson_1.records
                    if(records&&records.length>0){
                        let keyBranchFormData=records[records.length-1]
                        // 获取源分支
                        this.theKeyBranch=keyBranchFormData&&Object.values(keyBranchFormData.lists)[0].value
                    }
                    this.mergeProcess=JSON.parse(localStorage.getItem(this.codeAutoCommitId))
                    if(!this.mergeProcess)this.mergeProcess={}

                    // 获取源分支对应的表单信息
                    let allBranch = this.revertTable()
                    let keyRow = allBranch.find(i=>{
                        return i[1]===this.theKeyBranch
                    })
                    if(!keyRow||keyRow[7]!=='edit') return
                    // 如果源分支在目标分支，则设置目标分支的“是否合并”为是
                    this.setFieldState(keyRow[5],keyRow[6])
                },
                update: function () {
                    // this.init();
                },
                destroy: function () {
                    this.$el = null;
                },
                afterSave: function () {
                    localStorage.removeItem(this.codeAutoCommitId)
                },
                setFieldState: function (id, value) {
                    csdk.core.setFieldData({
                        fieldId: id,
                        fieldData: {
                            value
                        }
                    })
                },
                parseQuery(str) {
                    const obj = {};
                    str.split('&').forEach((item) => {
                      const array = item.split('=');
                      obj[array[0]] = decodeURIComponent(array[1]);
                    });
                    return obj;
                },
                revertTable: function () {
                    const { formmains, formsons, metadata } = window.csdk.core.getFormData();
                    const children = metadata.viewInfo.viewContent.children.slice(5);
                    const table = children.reduce((prev, next) => {
                        const tr = Object.keys(next.buildCells || {}).reduce((p, n) => {
                            const value = next.buildCells[n].children[0];
                            const sp = n.split(/[a-z]+/g).slice(1);
                            if (!value) return p;
                            if (!p[sp[0]]) {
                                p[sp[0]] = [];
                            }
                            if (value.type === "select") {
                                p[sp[0]][sp[1]] = formmains.formmain_76266[value.id].value
                                if(!!formmains.formmain_76266[value.id].enums[0]?.id){
                                    p[sp[0]][6] = formmains.formmain_76266[value.id].enums[0]?.id
                                    p[sp[0]][7] = formmains.formmain_76266[value.id].auth
                                }
                            } else {
                                p[sp[0]][sp[1]] = value.display;
                            }
                            if(p[sp[0]][4]&&p[sp[0]][4].includes('field')){
                                p[sp[0]][5]=p[sp[0]][4]
                            }
                            p[sp[0]][4] = value.id;
                            return p;
                        }, []);
                        return prev.concat(tr)
                    }, [])
                    .filter(i => {
                        return i[0] && i[0].startsWith("V")
                    });
                    return table;
                },
                getCommit: function (chooseCommit,keyBranch) {
                    const { formmains, formsons, metadata } = window.csdk.core.getFormData();
                    return formsons.front_formson_1.records.map(i => {
                        // if(!chooseCommit.map(({branch})=>branch).includes(Object.values(i.lists)[0].value)) {
                        //     return null;
                        // }
                        var href = Object.values(i.lists).find(ii => {
                            return ii.value.includes('/commit/')
                        })?.value;
                        return href && Object.values(i.lists)[0].value===keyBranch&&{
                            path: href.match(/(?<=gitlab.*.com\/).*(?=\/-\/)/g)[0],
                            commit: href.split('/').pop(),
                        }
                    }).filter(iii => {
                        return !!iii
                    });
                },
                checkBranchCommit(checkBranch){
                    const branchCommits=this.getCommit(this.targetBranch,checkBranch)
                    return branchCommits.length===this.targetCommits.length
                },
                handle: function () {
                    var btnEL = document.querySelector('#gitButton');
                    btnEL.setAttribute("disabled", "true");
                    const privateToken = document.querySelector('#gitInput').value;
                    if (!privateToken) {
                        $.alert(`请输入gitlab账户绑定的AccessToken! \r1、在登录gitlab后，点击右上角的头像，选择 "Preferences"。\n2、在左侧导航栏中，选择 "访问令牌（Access Tokens）" 。\n3、输入 AccessToken 的名称并选择token有效时间（不选则永久有效），token范围全选（其中包含api，read_user，read_api，read_repository，write_repository）。\n4、点击 "创建个人访问令牌（Create personal access token）" 按钮，将生成的 AccessToken 复制并填入输入框。`);
                        btnEL.removeAttribute("disabled");
                        return
                    };
                    this.tokenExpired=false
                    // 存储token
                    localStorage.setItem('Private-Token', privateToken);
                    this.config.headers['Private-Token'] = privateToken
                    // 获取选是的目标分支
                    this.targetBranch=this.revertTable().filter(i =>{ 
                        return i[2] === i[6]
                    }).map(i =>{
                        return { branch: i[1], id: i[4]}
                        }
                    );
                    if(!this.targetBranch.length){
                        $.alert('请选择要合并的分支！（要合并的分支选择=>是）');
                        btnEL.removeAttribute("disabled");
                        return;
                    }
                    // 获取目标分支下的目标commits
                    this.targetCommits = this.getCommit(this.targetBranch,this.theKeyBranch);
                    // this.targetCommits = [
                    //     {
                    //         "path": "cap/cap-front",
                    //         "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555"
                    //     },
                    // ]
                    if (!(this.targetCommits && this.targetCommits.length)) {
                        $.alert('没有可合并分支');
                        btnEL.removeAttribute("disabled");
                        return;
                    };
                    const commitList = this.targetBranch.map(({ branch, id }) => ({ branch, commits:this.targetCommits, id }))
                    // const commitList = [
                    //     {
                    //         "branch": "standard-V8.2-hotfix_20230531",
                    //         "commits": [
                    //             {
                    //                 "path": "cap/cap-front",
                    //                 "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555"
                    //             }
                    //         ],
                    //         "id": "field0098"
                    //     },
                    // ]
                    this.requestArr(commitList);
                },
                requestArr: function (commitList) {
                    const commit = commitList.pop();
                    var btnEL = document.querySelector('#gitButton');
                    if(this.tokenExpired){
                        btnEL.removeAttribute("disabled");
                        return
                    }
                    if (!commit) {
                        localStorage.setItem(this.codeAutoCommitId, JSON.stringify(this.mergeProcess));
                        document.querySelector('div[title=刷新关联]').click();
                        btnEL.removeAttribute("disabled");
                        return;
                    };
                    // 如果数量匹配判断已经合并完成
                    if(this.checkBranchCommit(commit.branch)){
                        this.setFieldState(commit.id,'成功')
                        commit.commits.forEach((i)=>{
                            this.mergeProcess[commit.branch+'++'+i.commit+'++'+i.path]='success'
                        })
                        return this.requestArr(commitList)
                    }
                    this.gitCherryPick(commit)
                    .then((result)=>{
                        let failMsg=''
                        let isSuccess=result.every((promiseRest)=>{
                            return promiseRest.status==='fulfilled'
                        })
                        if(isSuccess){
                            this.setFieldState(commit.id,`成功`);
                        }else{
                            let failReason={
                                'conflict':'冲突',
                                'falilure':'其他',
                                'cherry-picked':'cherry-picked',
                            }
                            result.forEach((eachPath)=>{
                                if(eachPath.status==='fulfilled'){
                                    failMsg+=`工程${eachPath.value}成功。`
                                }else{
                                    if(eachPath.reason?.process===1){
                                        if(eachPath.reason?.err?.response?.status === 404){
                                            failMsg+=`失败：工程${eachPath.reason?.path}不存在此分支。`
                                        }else{
                                            failMsg+=`失败：工程${eachPath.reason?.path}创建分支失败。`
                                        }
                                    }else if(eachPath.reason?.process===2){
                                        failMsg+=`失败${eachPath.reason?.errorCode?'：'+failReason[eachPath.reason?.errorCode]:''}，源commit:${eachPath.reason?.commit},工程:${eachPath.reason?.path}。`
                                    }else if(eachPath.reason?.process===3){
                                        failMsg+=`失败：工程${eachPath.reason?.path}合并分支失败。`
                                    }
                                }
                            })
                            this.setFieldState(commit.id,failMsg);
                        }
                        this.requestArr(commitList)
                    })
                },
                gitCherryPick:async function(data){
                    let theToast=$.toast({
                        heading: '正在合并',
                        text: '当前处理的分支：【' + data.branch + "】  耐心等待！",
                        position: {left:"100px",top:'50%'}, 
                    })
                    // data={
                    //         "branch": "standard-V8.0SP2LTS-hotfix_1",
                    //         "commits": [
                    //             {
                    //                 "path": "mplus/mplus-front",
                    //                 "commit": "2a7a7886ddfafceba2ac4befcb6f62e083a67431"
                    //             },
                    //             {
                    //                 "path": "mplus/mplus-front",
                    //                 "commit": "2e724d85bf888ee1c04968db0e0e54ff934dcdef"
                    //             },
                    //             {
                    //                 "path": "cap/cap-front",
                    //                 "commit": "2e724d85bf888ee1c04968db0e0e54ff934dcdef"
                    //             },
                    //         ],
                    //         "id": "field0104"
                    //     }
                    // 处理多工程
                    const ob = {};
                    for (const i of data.commits) {
                        if(!ob[i.path]){
                            ob[i.path] = [];
                        }
                            ob[i.path].push(i);
                    }
                    // {
                    //     "cap/cap-front": [
                    //         {
                    //             "path": "cap/cap-front",
                    //             "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555"
                    //         }
                    //     ]
                    // }
                    const splitArr =  Object.values(ob).map(i=>({...data,commits:i}));
                    // [
                    //     {
                    //         "branch": "standard-V8.2-hotfix_20230531",
                    //         "commits": [
                    //             {
                    //                 "path": "cap/cap-front",
                    //                 "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555"
                    //             }
                    //         ],
                    //         "id": "field0098"
                    //     },
                    // ]
                    const pro = async (eachCherryPickData)=>{
                        //     {
                        //         "branch": "standard-V8.2-hotfix_20230531",
                        //         "commits": [
                        //             {
                        //                 "path": "cap/cap-front",
                        //                 "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555"
                        //             }
                        //         ],
                        //         "id": "field0098"
                        //     },
                        // 
                        // 一、创建临时分支，如果已存在的话删除重新创建
                        try{
                            console.log('getBranch')
                            await this.getBranch(eachCherryPickData)
                            console.log('deleteBranch')
                            await this.deleteBranch(eachCherryPickData)
                        } catch ({response}) {
                            if (response&&response.status === 401) {
                                theToast.reset()
                                if(this.tokenExpired===false){
                                    $.alert(' token 失效');
                                }
                                this.tokenExpired=true
                                return Promise.reject({process:0})
                            }
                            console.error(response)
                        }
                        try{
                            console.log('postBranch')
                            await this.postBranch(eachCherryPickData)
                        } catch (err) {
                            console.error(err)
                            return Promise.reject({process:1,err,path:eachCherryPickData.commits[0].path})
                        }
                        // 二、cherry_pick
                        try{
                            console.log('cherry_pick')
                            await this.cherry_pick(eachCherryPickData)
                        } catch (err) {
                            console.error(err)
                            return Promise.reject(err)
                        }
                        // 三、mergeRequest
                        try{
                            console.log('mergeRequest',eachCherryPickData)
                            await this.mergeTitle&&this.mergeRequest(eachCherryPickData, this.mergeTitle)
                        } catch (err) {
                            console.log(err)
                            return Promise.reject({process:3,err,path:eachCherryPickData.commits[0].path})
                        }
                        return Promise.resolve(eachCherryPickData.commits[0].path)
                    }
                    return Promise.allSettled(splitArr.map(pro))
                },
                getCommitInfo: function (sha) {
                    return axios.get(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/commits/${sha}`, this.config).then(console.log)
                },
                nameBranch: function (data) {
                    return 'GitAutoMerge_' + data.branch + '_' + data.commits[0].commit;
                },
                getRepositoryPath: function (data) {
                    return data.commits[0].path.replace(/\//g, '%2F');
                },
                getRepositoryPathByCommit: function (commit) {
                    return commit.path.replace(/\//g, '%2F');
                },
                cherry_pick: async function (eachCherryPickData) {
                    const commits = [...eachCherryPickData.commits];
                    const cp = async (commits) => {
                        const commitO = commits.pop();
                        const commit = commitO && commitO.commit;
                        const path = commitO && commitO.path;
                        if (!commit) return;
                        try {
                            const res = await axios.post(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(eachCherryPickData)}/repository/commits/${commit}/cherry_pick`, { branch: this.nameBranch(eachCherryPickData), sha: commit }, this.config)
                            this.mergeTitle = res.data.title;
                            this.mergeProcess[eachCherryPickData.branch+'++'+commit+'++'+path]='success'
                            if(commits.length>0){
                                await cp(commits)
                            }else{
                                return
                            }
                        } catch (error) {
                            console.error(error);
                            let response = error.response
                            if(!response)Promise.reject({process:2})
                            if(!response.data)Promise.reject({process:2})
                            let errorCode=response.data.error_code
                            let message=response.data.message
                            let mergeProcessKey=eachCherryPickData.branch+'++'+commit+'++'+path
                            if (errorCode==='conflict') {
                                this.mergeProcess[mergeProcessKey]='conflict'
                            }else if(message.includes('cherry-picked')){
                                errorCode='cherry-picked'
                                this.mergeProcess[mergeProcessKey]='cherry-picked'
                            }else {
                                errorCode='falilure'
                                this.mergeProcess[mergeProcessKey]='falilure'
                            }
                            if(!this.mergeProcess.errorMessage)this.mergeProcess.errorMessage={}
                            this.mergeProcess.errorMessage[mergeProcessKey]=message + ' Code:' + errorCode
                            // 失败的时候删除临时分支
                            await this.getBranch(eachCherryPickData)
                            await this.deleteBranch(eachCherryPickData)
                            return Promise.reject({process:2,path,commit,errorCode})
                        }
                    }
                    return cp(commits)
                },
                createBranch: function (data) {
                    return axios.get(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches/${this.nameBranch(data)}`, this.config)
                    .then(() => {
                        return axios.delete(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches/${this.nameBranch(data)}`, this.config)
                        .then(res => this.nameBranch(data))
                    }, rej => this.nameBranch(data))
                    .then((name) => {
                        return axios.post(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches`, { branch: this.nameBranch(data), ref: data.branch }, this.config)
                    })
                },
                getBranch:function(data){
                    return axios.get(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches/${this.nameBranch(data)}`, this.config)
                },
                deleteBranch:function(data){
                    return axios.delete(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches/${this.nameBranch(data)}`, this.config)
                },
                postBranch:function(data){
                    return axios.post(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches`, { branch: this.nameBranch(data), ref: data.branch }, this.config)
                },
                mergeRequest: function (data, title) {
                    return axios.post(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/merge_requests`, { title, target_branch: data.branch, source_branch: this.nameBranch(data),remove_source_branch:true }, this.config)
                },
                getAllBranch: function (data) {
                    return axios.get(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches?per_page=200`, this.config)
                },
                postCherryPick:function(data){
                    const commit = data.commit;
                    return axios.post(`https://gitlab.*.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/commits/${commit}/cherry_pick`, { branch: this.nameBranch(data), sha: commit }, this.config)
                },
            }
        };
    }
    csdk.component.register('field_1689672732255', gitAutoMQ);
    // csdk.component.register('field_1685342943954', gitAutoMQ);
})();